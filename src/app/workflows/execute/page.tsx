'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Play, Trash2 } from 'lucide-react';
import { WorkflowAPIClient } from '@/lib/workflow-api';
import { WorkflowEvent, WorkflowRepositoryRequest } from '@/types/workflow-execution';
import WorkflowCard from '@/components/WorkflowCard';
import { rememberAgentResult } from '@/lib/workflow-memory';

type RepositoryAccess = 'public' | 'private';
type PrivateRepoAuthMethod = 'credential_reference' | 'personal_access_token' | 'github_app' | 'ssh_deploy_key';

interface ExecutionStep {
  id: number;
  name: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration: number;
  input: any;
  output: any;
  progress: number;
  startTime?: string;
  endTime?: string;
}

interface WorkflowInstance {
  id: string;
  repoUrl: string;
  repoIndex?: number;
  branch: string;
  triggeredBy: string;
  workflowType: 'repo_remediation' | 'infrastructure_scan';
  status: 'running' | 'completed' | 'failed' | 'pending';
  currentStep: number;
  steps: ExecutionStep[];
  events: WorkflowEvent[];
  startTime: string;
  eventSource?: EventSource;
  isExpanded: boolean;
}

interface RepositoryInput {
  id: string;
  repo_url: string;
  branch: string;
  repository_access: RepositoryAccess;
  auth_provider: string;
  auth_method: PrivateRepoAuthMethod;
  credential_reference: string;
  username: string;
  installation_id: string;
  access_token: string;
  ssh_private_key: string;
}

type InfrastructureTargetType = 'repo' | 'kubernetes_cluster';

const initialSteps: ExecutionStep[] = [
  { id: 1, name: 'Repository Scan', agent: 'scanner_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 2, name: 'GitHub Issues', agent: 'github_issue_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 3, name: 'Vulnerability Analysis', agent: 'analysis_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 4, name: 'Remediation', agent: 'remediation_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 5, name: 'Validation', agent: 'validation_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 6, name: 'Pull Request', agent: 'pr_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
];

const infrastructureSteps: ExecutionStep[] = [
  { id: 1, name: 'Access Check', agent: 'cluster_access_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 2, name: 'Infra Scan', agent: 'kubernetes_scanner_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 3, name: 'Risk Analysis', agent: 'kubernetes_analysis_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 4, name: 'Report', agent: 'infrastructure_report_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
];

const infrastructureRepoSteps: ExecutionStep[] = [
  { id: 1, name: 'Target Prep', agent: 'infra_input_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 2, name: 'IaC Scan', agent: 'infrastructure_scanner_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 3, name: 'Risk Analysis', agent: 'infrastructure_analysis_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 4, name: 'Report', agent: 'infrastructure_report_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
];

const ENABLE_MOCK_DATA = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true';
const DEFAULT_BRANCH = 'main';
const DEFAULT_MAX_CONCURRENCY = 3;
const DEFAULT_TRIGGERED_BY = 'ui';

function generateInputId() {
  return `repo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateWorkflowId(index?: number) {
  const indexPart = typeof index === 'number' ? `${index}_` : '';
  return `wf_${Date.now()}_${indexPart}${Math.random().toString(36).slice(2, 9)}`;
}

function createRepositoryInput(
  repoUrl = '',
  branch = DEFAULT_BRANCH,
  id = generateInputId()
): RepositoryInput {
  return {
    id,
    repo_url: repoUrl,
    branch,
    repository_access: 'public',
    auth_provider: 'github',
    auth_method: 'credential_reference',
    credential_reference: '',
    username: '',
    installation_id: '',
    access_token: '',
    ssh_private_key: '',
  };
}

function getPrivateRepoConnection(
  input: Pick<
    RepositoryInput,
    | 'repository_access'
    | 'auth_provider'
    | 'auth_method'
    | 'credential_reference'
    | 'username'
    | 'installation_id'
    | 'access_token'
    | 'ssh_private_key'
  >,
  includeSecrets = true
) {
  if (input.repository_access !== 'private') {
    return undefined;
  }

  return {
    provider: input.auth_provider,
    auth_method: input.auth_method,
    username: input.username.trim() || undefined,
    credential_reference: input.credential_reference.trim() || undefined,
    installation_id: input.installation_id.trim() || undefined,
    access_token: includeSecrets ? input.access_token.trim() || undefined : undefined,
    ssh_private_key: includeSecrets ? input.ssh_private_key.trim() || undefined : undefined,
  };
}

function validatePrivateRepoConnection(label: string, input: RepositoryInput | typeof defaultPrivateRepoFields) {
  if (input.repository_access !== 'private') {
    return true;
  }

  const hasCredentialReference = Boolean(input.credential_reference.trim());
  const hasAccessToken = Boolean('access_token' in input && input.access_token.trim());
  const hasSshKey = Boolean('ssh_private_key' in input && input.ssh_private_key.trim());
  const hasInstallationId = Boolean(input.installation_id.trim());

  if (input.auth_method === 'credential_reference' && !hasCredentialReference) {
    alert(`${label} needs a credential reference for private access.`);
    return false;
  }

  if (input.auth_method === 'personal_access_token' && !hasCredentialReference && !hasAccessToken) {
    alert(`${label} needs a token or credential reference for private access.`);
    return false;
  }

  if (input.auth_method === 'github_app' && (!hasInstallationId || !hasCredentialReference)) {
    alert(`${label} needs GitHub App installation ID and credential reference.`);
    return false;
  }

  if (input.auth_method === 'ssh_deploy_key' && !hasCredentialReference && !hasSshKey) {
    alert(`${label} needs an SSH deploy key or credential reference.`);
    return false;
  }

  return true;
}

const defaultPrivateRepoFields = {
  repository_access: 'public' as RepositoryAccess,
  auth_provider: 'github',
  auth_method: 'credential_reference' as PrivateRepoAuthMethod,
  credential_reference: '',
  username: '',
  installation_id: '',
  access_token: '',
  ssh_private_key: '',
};

function cloneSteps(steps: ExecutionStep[]): ExecutionStep[] {
  return steps.map(step => ({
    ...step,
    input: {},
    output: {},
  }));
}

function getScopedRepoIndex(event: WorkflowEvent, targets: WorkflowRepositoryRequest[]) {
  if ('repo_index' in event && typeof event.repo_index === 'number') {
    return event.repo_index;
  }

  if ('repo_url' in event && typeof event.repo_url === 'string') {
    const matchedIndex = targets.findIndex(target => target.repo_url === event.repo_url);
    return matchedIndex >= 0 ? matchedIndex : undefined;
  }

  return undefined;
}

function getBatchResults(event: WorkflowEvent) {
  return 'results' in event && Array.isArray(event.results) ? event.results : [];
}

function getBatchSummary(event: WorkflowEvent) {
  return 'summary' in event && event.summary ? event.summary : undefined;
}

interface RepositoryAccessFieldsProps {
  access: RepositoryAccess;
  provider: string;
  authMethod: PrivateRepoAuthMethod;
  credentialReference: string;
  username: string;
  installationId: string;
  accessToken: string;
  sshPrivateKey: string;
  onChange: (changes: {
    repository_access?: RepositoryAccess;
    auth_provider?: string;
    auth_method?: PrivateRepoAuthMethod;
    credential_reference?: string;
    username?: string;
    installation_id?: string;
    access_token?: string;
    ssh_private_key?: string;
  }) => void;
}

function RepositoryAccessFields({
  access,
  provider,
  authMethod,
  credentialReference,
  username,
  installationId,
  accessToken,
  sshPrivateKey,
  onChange,
}: RepositoryAccessFieldsProps) {
  const isPrivate = access === 'private';

  return (
    <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-900/70 p-4">
      <div>
        <div className="mb-2 text-sm font-medium text-gray-300">Repository visibility</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(['public', 'private'] as RepositoryAccess[]).map(option => (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-all ${
                access === option
                  ? 'border-purple-500 bg-purple-500/15 text-white'
                  : 'border-gray-700 bg-gray-950 text-gray-300 hover:border-gray-500'
              }`}
            >
              <input
                type="radio"
                checked={access === option}
                onChange={() => onChange({ repository_access: option })}
                className="h-4 w-4"
              />
              <span className="capitalize">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {isPrivate && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Git provider</label>
              <select
                value={provider}
                onChange={(event) => onChange({ auth_provider: event.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
              >
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
                <option value="bitbucket">Bitbucket</option>
                <option value="azure_devops">Azure DevOps</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Auth method</label>
              <select
                value={authMethod}
                onChange={(event) => onChange({ auth_method: event.target.value as PrivateRepoAuthMethod })}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
              >
                <option value="credential_reference">Secret reference</option>
                <option value="personal_access_token">Personal access token</option>
                <option value="github_app">GitHub App</option>
                <option value="ssh_deploy_key">SSH deploy key</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Credential reference</label>
              <input
                type="text"
                value={credentialReference}
                onChange={(event) => onChange({ credential_reference: event.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                placeholder="vault/github/prod-readonly"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Username or owner</label>
              <input
                type="text"
                value={username}
                onChange={(event) => onChange({ username: event.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                placeholder="org or service account"
              />
            </div>
            {authMethod === 'github_app' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Installation ID</label>
                <input
                  type="text"
                  value={installationId}
                  onChange={(event) => onChange({ installation_id: event.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  placeholder="12345678"
                />
              </div>
            )}
            {authMethod === 'personal_access_token' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Access token</label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(event) => onChange({ access_token: event.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  placeholder="Paste token or use credential reference"
                />
              </div>
            )}
          </div>

          {authMethod === 'ssh_deploy_key' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">SSH private key</label>
              <textarea
                value={sshPrivateKey}
                onChange={(event) => onChange({ ssh_private_key: event.target.value })}
                className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                placeholder="Use a credential reference when possible"
              />
            </div>
          )}

          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs leading-5 text-blue-100">
            For private repositories, a read-only token, GitHub App installation, SSH deploy key, or secret-manager credential reference is required. Secrets are not shown in workflow cards.
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExecuteWorkflowPage() {
  const router = useRouter();
  const batchStreamRef = useRef<EventSource | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [repositoryInputs, setRepositoryInputs] = useState<RepositoryInput[]>(() => [
    createRepositoryInput(
      ENABLE_MOCK_DATA ? 'https://github.com/kim815/vulnerable-repo' : '',
      DEFAULT_BRANCH,
      'repo_initial'
    ),
  ]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [infrastructureMock, setInfrastructureMock] = useState<any>(null);
  const [formData, setFormData] = useState({
    workflow_type: 'repo_remediation' as 'repo_remediation' | 'infrastructure_scan',
    repo_url: ENABLE_MOCK_DATA ? 'https://github.com/kim815/vulnerable-repo' : '',
    branch: ENABLE_MOCK_DATA ? DEFAULT_BRANCH : '',
    triggered_by: DEFAULT_TRIGGERED_BY,
    repo_repository_access: 'public' as RepositoryAccess,
    repo_auth_provider: 'github',
    repo_auth_method: 'credential_reference' as PrivateRepoAuthMethod,
    repo_credential_reference: '',
    repo_username: '',
    repo_installation_id: '',
    repo_access_token: '',
    repo_ssh_private_key: '',
    infrastructure_target: 'kubernetes_cluster' as InfrastructureTargetType,
    iac_repo_url: 'https://github.com/company/infrastructure',
    iac_branch: DEFAULT_BRANCH,
    iac_path: 'k8s/overlays/prod',
    iac_repository_access: 'public' as RepositoryAccess,
    iac_auth_provider: 'github',
    iac_auth_method: 'credential_reference' as PrivateRepoAuthMethod,
    iac_credential_reference: '',
    iac_username: '',
    iac_installation_id: '',
    iac_access_token: '',
    iac_ssh_private_key: '',
    cluster_name: 'prod-eks-us-east-1',
    kubeconfig_context: 'prod-admin',
    namespace: 'all-namespaces',
    cloud_provider: 'aws',
    compliance_profile: 'cis-kubernetes',
    severity_levels: 'CRITICAL,HIGH,MEDIUM',
    scan_rbac: true,
    scan_network_policies: true,
    scan_secrets: false,
    timeout: '600',
  });

  useEffect(() => {
    fetch('/mock-data/infrastructure-scan.json')
      .then(res => res.json())
      .then(setInfrastructureMock)
      .catch(error => console.error('Error loading infrastructure scan mock data:', error));
  }, []);

  useEffect(() => {
    return () => {
      batchStreamRef.current?.close();
      setWorkflows(currentWorkflows => {
        currentWorkflows.forEach(wf => wf.eventSource?.close());
        return currentWorkflows;
      });
    };
  }, []);

  const updateRepositoryInput = (id: string, changes: Partial<Omit<RepositoryInput, 'id'>>) => {
    setRepositoryInputs(prev =>
      prev.map(input => (input.id === id ? { ...input, ...changes } : input))
    );
  };

  const addRepositoryInput = () => {
    setRepositoryInputs(prev => [...prev, createRepositoryInput()]);
  };

  const removeRepositoryInput = (id: string) => {
    setRepositoryInputs(prev => {
      if (prev.length === 1) {
        return [createRepositoryInput()];
      }

      return prev.filter(input => input.id !== id);
    });
  };

  const buildRepositoryTargets = (): WorkflowRepositoryRequest[] | null => {
    const emptyIndex = repositoryInputs.findIndex(input => !input.repo_url.trim());
    if (emptyIndex !== -1) {
      alert(`Repository ${emptyIndex + 1} needs a URL before triggering the batch.`);
      return null;
    }

    const invalidPrivateIndex = repositoryInputs.findIndex((input, index) =>
      !validatePrivateRepoConnection(`Repository ${index + 1}`, input)
    );
    if (invalidPrivateIndex !== -1) {
      return null;
    }

    const targets = repositoryInputs.map(input => ({
      repo_url: input.repo_url.trim(),
      branch: DEFAULT_BRANCH,
      commit_sha: 'HEAD',
      repository_access: input.repository_access,
      private_repository: getPrivateRepoConnection(input),
    }));
    const duplicateUrl = targets.find((target, index) =>
      targets.findIndex(candidate => candidate.repo_url === target.repo_url) !== index
    );

    if (duplicateUrl) {
      alert(`Remove the duplicate repository URL before triggering: ${duplicateUrl.repo_url}`);
      return null;
    }

    return targets;
  };

  const getSingleRepoConnection = (includeSecrets = true) => getPrivateRepoConnection({
    repository_access: formData.repo_repository_access,
    auth_provider: formData.repo_auth_provider,
    auth_method: formData.repo_auth_method,
    credential_reference: formData.repo_credential_reference,
    username: formData.repo_username,
    installation_id: formData.repo_installation_id,
    access_token: formData.repo_access_token,
    ssh_private_key: formData.repo_ssh_private_key,
  }, includeSecrets);

  const getIacRepoConnection = (includeSecrets = true) => getPrivateRepoConnection({
    repository_access: formData.iac_repository_access,
    auth_provider: formData.iac_auth_provider,
    auth_method: formData.iac_auth_method,
    credential_reference: formData.iac_credential_reference,
    username: formData.iac_username,
    installation_id: formData.iac_installation_id,
    access_token: formData.iac_access_token,
    ssh_private_key: formData.iac_ssh_private_key,
  }, includeSecrets);

  const getInfrastructureTargetLabel = () => {
    if (formData.infrastructure_target === 'repo') {
      return formData.iac_repo_url;
    }

    return `kubernetes://${formData.cluster_name}`;
  };

  const getInfrastructureBranchLabel = () => {
    if (formData.infrastructure_target === 'repo') {
      return `${formData.iac_branch}:${formData.iac_path || '/'}`;
    }

    return `${formData.kubeconfig_context} / ${formData.namespace || 'all-namespaces'}`;
  };

  const buildInfrastructureInput = () => {
    if (formData.infrastructure_target === 'repo') {
      return {
        target_type: 'repo',
        repository_url: formData.iac_repo_url,
        branch: formData.iac_branch,
        manifest_path: formData.iac_path,
        repository_access: formData.iac_repository_access,
        private_repository: getIacRepoConnection(false),
        severity_levels: formData.severity_levels.split(',').map(item => item.trim()).filter(Boolean),
        compliance_profile: formData.compliance_profile,
      };
    }

    return {
      target_type: 'kubernetes_cluster',
      cluster_name: formData.cluster_name,
      kubeconfig_context: formData.kubeconfig_context,
      namespace: formData.namespace,
      cloud_provider: formData.cloud_provider,
      severity_levels: formData.severity_levels.split(',').map(item => item.trim()).filter(Boolean),
      compliance_profile: formData.compliance_profile,
      include_rbac: formData.scan_rbac,
      include_network_policies: formData.scan_network_policies,
      include_secrets: formData.scan_secrets,
      timeout: Number(formData.timeout) || 600,
    };
  };

  const rememberRepoEvent = (
    workflowId: string,
    target: WorkflowRepositoryRequest,
    event: WorkflowEvent
  ) => {
    if (event.event === 'agent_status' && event.agent && (event.status === 'completed' || event.status === 'failed')) {
      try {
        const stepName = initialSteps.find(step => step.agent === event.agent)?.name || event.agent;
        rememberAgentResult({
          workflowId,
          agent: event.agent,
          stepName,
          status: event.status,
          timestamp: event.timestamp,
          repoUrl: target.repo_url,
          branch: target.branch || DEFAULT_BRANCH,
          output: event.status === 'failed'
            ? { error: event.error?.message || 'Unknown error' }
            : event.data || {},
        });
      } catch (memoryError) {
        console.warn(`[${workflowId}] Failed to save temporary agent result`, memoryError);
      }
    }

    if (event.event === 'workflow_completed') {
      try {
        const workflowSummary = 'summary' in event ? event.summary : undefined;
        const workflowStatus = event.status === 'failed' ? 'failed' : 'completed';
        rememberAgentResult({
          workflowId,
          agent: 'workflow',
          stepName: 'Workflow Summary',
          status: workflowStatus,
          timestamp: event.timestamp,
          repoUrl: target.repo_url,
          branch: target.branch || DEFAULT_BRANCH,
          output: workflowSummary || ('data' in event ? event.data : undefined) || {},
        });
      } catch (memoryError) {
        console.warn(`[${workflowId}] Failed to save temporary workflow summary`, memoryError);
      }
    }
  };

  const applyRepoEvent = (
    workflowId: string,
    target: WorkflowRepositoryRequest,
    event: WorkflowEvent
  ) => {
    rememberRepoEvent(workflowId, target, event);

    setWorkflows(prev => prev.map(wf => {
      if (wf.id !== workflowId) return wf;

      const updatedEvents = [...wf.events, event];
      const updatedSteps = [...wf.steps];
      let updatedStatus = wf.status;
      let updatedCurrentStep = wf.currentStep;

      if (event.event === 'agent_status' && event.agent) {
        const agentIndex = updatedSteps.findIndex(step => step.agent === event.agent);
        if (agentIndex !== -1) {
          if (event.status === 'started') {
            updatedStatus = 'running';
            updatedCurrentStep = agentIndex;
            updatedSteps[agentIndex] = {
              ...updatedSteps[agentIndex],
              status: 'running',
              startTime: event.timestamp,
              progress: 50,
              input: {
                repository_url: target.repo_url,
                branch: target.branch || DEFAULT_BRANCH,
                repository_access: target.repository_access || 'public',
              },
            };
          } else if (event.status === 'completed') {
            const startTime = updatedSteps[agentIndex].startTime;
            const duration = startTime
              ? Math.round((new Date(event.timestamp).getTime() - new Date(startTime).getTime()) / 1000)
              : 0;
            updatedSteps[agentIndex] = {
              ...updatedSteps[agentIndex],
              status: 'completed',
              endTime: event.timestamp,
              progress: 100,
              duration,
              output: event.data || {},
            };
          } else if (event.status === 'failed') {
            updatedSteps[agentIndex] = {
              ...updatedSteps[agentIndex],
              status: 'failed',
              endTime: event.timestamp,
              progress: 100,
              output: { error: event.error?.message || 'Unknown error' },
            };
            updatedStatus = 'failed';
          }
        }
      } else if (event.event === 'workflow_completed') {
        updatedStatus = event.status === 'failed' ? 'failed' : 'completed';
      }

      return {
        ...wf,
        events: updatedEvents,
        steps: updatedSteps,
        status: updatedStatus,
        currentStep: updatedCurrentStep,
      };
    }));
  };

  const executeInfrastructureWorkflow = async (
    workflowId: string,
    workflow: WorkflowInstance,
    targetType: InfrastructureTargetType,
    inputData: Record<string, any>
  ) => {
    const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

    setWorkflows(prev => prev.map(wf =>
      wf.id === workflowId ? { ...wf, status: 'running' } : wf
    ));

    try {
      const mock = infrastructureMock || await fetch('/mock-data/infrastructure-scan.json').then(res => res.json());
      const execution = mock.executions[targetType];

      for (const agentRun of execution.agents) {
        const startedAt = new Date().toISOString();
        const startedEvent: WorkflowEvent = {
          event: 'agent_status',
          agent: agentRun.agent,
          status: 'started',
          timestamp: startedAt,
          data: inputData,
        };

        setWorkflows(prev => prev.map(wf => {
          if (wf.id !== workflowId) return wf;
          const agentIndex = wf.steps.findIndex(step => step.agent === agentRun.agent);
          const updatedSteps = [...wf.steps];

          if (agentIndex !== -1) {
            updatedSteps[agentIndex] = {
              ...updatedSteps[agentIndex],
              status: 'running',
              startTime: startedAt,
              progress: 50,
              input: inputData,
            };
          }

          return {
            ...wf,
            events: [...wf.events, startedEvent],
            currentStep: agentIndex === -1 ? wf.currentStep : agentIndex,
          };
        }));

        await wait(450);

        const completedAt = new Date().toISOString();
        const completedEvent: WorkflowEvent = {
          event: 'agent_status',
          agent: agentRun.agent,
          status: 'completed',
          timestamp: completedAt,
          data: agentRun.output,
        };

        rememberAgentResult({
          workflowId,
          agent: agentRun.agent,
          stepName: agentRun.step_name,
          status: 'completed',
          timestamp: completedAt,
          repoUrl: workflow.repoUrl,
          branch: workflow.branch,
          output: agentRun.output,
        });

        setWorkflows(prev => prev.map(wf => {
          if (wf.id !== workflowId) return wf;
          const agentIndex = wf.steps.findIndex(step => step.agent === agentRun.agent);
          const updatedSteps = [...wf.steps];

          if (agentIndex !== -1) {
            updatedSteps[agentIndex] = {
              ...updatedSteps[agentIndex],
              status: 'completed',
              endTime: completedAt,
              progress: 100,
              duration: agentRun.duration_seconds,
              output: agentRun.output,
            };
          }

          return {
            ...wf,
            events: [...wf.events, completedEvent],
            steps: updatedSteps,
            currentStep: agentIndex === -1 ? wf.currentStep : agentIndex,
          };
        }));
      }

      const completedAt = new Date().toISOString();
      const workflowEvent: WorkflowEvent = {
        event: 'workflow_completed',
        status: 'completed',
        timestamp: completedAt,
        summary: execution.summary,
      };

      rememberAgentResult({
        workflowId,
        agent: 'workflow',
        stepName: 'Infrastructure Scan Summary',
        status: 'completed',
        timestamp: completedAt,
        repoUrl: workflow.repoUrl,
        branch: workflow.branch,
        output: execution.summary,
      });

      setWorkflows(prev => prev.map(wf =>
        wf.id === workflowId
          ? { ...wf, status: 'completed', events: [...wf.events, workflowEvent] }
          : wf
      ));
    } catch (error) {
      console.error(`[${workflowId}] Infrastructure scan error:`, error);
      setWorkflows(prev => prev.map(wf =>
        wf.id === workflowId ? { ...wf, status: 'failed' } : wf
      ));
    }
  };

  const executeWorkflow = async (workflowId: string, workflow: WorkflowInstance) => {
    const privateRepository = getSingleRepoConnection();
    const target = {
      repo_url: workflow.repoUrl,
      branch: workflow.branch || DEFAULT_BRANCH,
      repository_access: formData.repo_repository_access,
      private_repository: privateRepository,
    };

    setWorkflows(prev => prev.map(wf =>
      wf.id === workflowId ? { ...wf, status: 'running' } : wf
    ));

    try {
      const eventSource = WorkflowAPIClient.triggerWorkflow(
        {
          repo_url: workflow.repoUrl,
          branch: workflow.branch,
          triggered_by: workflow.triggeredBy,
          repository_access: formData.repo_repository_access,
          private_repository: privateRepository,
        },
        (event: WorkflowEvent) => {
          console.log(`[${workflowId}] Event received:`, event);
          applyRepoEvent(workflowId, target, event);
        },
        (error: Error) => {
          console.error(`[${workflowId}] Stream error:`, error);
          setWorkflows(prev => prev.map(wf =>
            wf.id === workflowId ? { ...wf, status: 'failed' } : wf
          ));
        },
        () => {
          console.log(`[${workflowId}] Stream completed`);
        }
      );

      setWorkflows(prev => prev.map(wf =>
        wf.id === workflowId ? { ...wf, eventSource } : wf
      ));
    } catch (error) {
      console.error(`[${workflowId}] Execution error:`, error);
      setWorkflows(prev => prev.map(wf =>
        wf.id === workflowId ? { ...wf, status: 'failed' } : wf
      ));
    }
  };

  const addNewWorkflow = () => {
    if (formData.workflow_type === 'repo_remediation' && !formData.repo_url.trim()) {
      alert('Please enter a repository URL');
      return;
    }

    if (
      formData.workflow_type === 'repo_remediation' &&
      !validatePrivateRepoConnection('Repository workflow', {
        ...defaultPrivateRepoFields,
        repository_access: formData.repo_repository_access,
        auth_provider: formData.repo_auth_provider,
        auth_method: formData.repo_auth_method,
        credential_reference: formData.repo_credential_reference,
        username: formData.repo_username,
        installation_id: formData.repo_installation_id,
        access_token: formData.repo_access_token,
        ssh_private_key: formData.repo_ssh_private_key,
      })
    ) {
      return;
    }

    if (formData.workflow_type === 'infrastructure_scan') {
      if (formData.infrastructure_target === 'repo' && !formData.iac_repo_url.trim()) {
        alert('Please enter an infrastructure repository URL');
        return;
      }

      if (
        formData.infrastructure_target === 'repo' &&
        !validatePrivateRepoConnection('Infrastructure repository', {
          ...defaultPrivateRepoFields,
          repository_access: formData.iac_repository_access,
          auth_provider: formData.iac_auth_provider,
          auth_method: formData.iac_auth_method,
          credential_reference: formData.iac_credential_reference,
          username: formData.iac_username,
          installation_id: formData.iac_installation_id,
          access_token: formData.iac_access_token,
          ssh_private_key: formData.iac_ssh_private_key,
        })
      ) {
        return;
      }

      if (formData.infrastructure_target === 'kubernetes_cluster' && (!formData.cluster_name.trim() || !formData.kubeconfig_context.trim())) {
        alert('Please enter Kubernetes cluster name and kubeconfig context');
        return;
      }
    }

    const workflowId = generateWorkflowId();
    const isInfrastructureScan = formData.workflow_type === 'infrastructure_scan';
    const infrastructureInput = buildInfrastructureInput();
    const newWorkflow: WorkflowInstance = {
      id: workflowId,
      repoUrl: isInfrastructureScan ? getInfrastructureTargetLabel() : formData.repo_url.trim(),
      branch: isInfrastructureScan ? getInfrastructureBranchLabel() : formData.branch.trim() || DEFAULT_BRANCH,
      triggeredBy: formData.triggered_by || DEFAULT_TRIGGERED_BY,
      workflowType: formData.workflow_type,
      status: 'pending',
      currentStep: 0,
      steps: cloneSteps(
        isInfrastructureScan
          ? formData.infrastructure_target === 'repo'
            ? infrastructureRepoSteps
            : infrastructureSteps
          : initialSteps
      ),
      events: [],
      startTime: new Date().toISOString(),
      isExpanded: true,
    };

    setWorkflows(prev => [newWorkflow, ...prev]);
    setShowAddForm(false);

    if (isInfrastructureScan) {
      void executeInfrastructureWorkflow(workflowId, newWorkflow, formData.infrastructure_target, infrastructureInput);
    } else {
      void executeWorkflow(workflowId, newWorkflow);
    }
  };

  const applyBatchCompleted = (
    event: WorkflowEvent,
    workflowIdByIndex: Map<number, string>,
    repoIndexByWorkflowId: Map<string, number>,
    targets: WorkflowRepositoryRequest[]
  ) => {
    const results = getBatchResults(event);
    const summary = getBatchSummary(event);
    const batchFailed = 'status' in event && event.status === 'failed';
    const batchErrorMessage = 'error' in event ? event.error?.message : undefined;

    if (batchErrorMessage) {
      setBatchError(batchErrorMessage);
    }

    if (summary && 'completed' in summary && 'failed' in summary) {
      setBatchMessage(
        `Batch finished: ${summary.completed} completed, ${summary.failed} failed.`
      );
    } else {
      setBatchMessage('Batch finished.');
    }

    setIsTriggering(false);

    setWorkflows(prev => prev.map(wf => {
      const repoIndex = repoIndexByWorkflowId.get(wf.id);
      if (repoIndex === undefined) return wf;

      const target = targets[repoIndex];
      const result =
        results.find(item => item.repo_url === target.repo_url) ||
        results[repoIndex];

      if (!result) {
        if (batchFailed && (wf.status === 'pending' || wf.status === 'running')) {
          return {
            ...wf,
            status: 'failed',
            events: [...wf.events, event],
          };
        }

        return wf;
      }

      const nextStatus = result.status === 'completed' ? 'completed' : 'failed';
      if (wf.status === 'completed' || wf.status === 'failed') {
        return wf;
      }

      return {
        ...wf,
        status: nextStatus,
        events: [...wf.events, event],
      };
    }));

    results.forEach((result, index) => {
      const workflowId = workflowIdByIndex.get(index);
      if (!workflowId) return;

      try {
        rememberAgentResult({
          workflowId,
          agent: 'batch',
          stepName: 'Batch Summary',
          status: result.status,
          timestamp: event.timestamp,
          repoUrl: result.repo_url,
          branch: result.branch || targets[index]?.branch || DEFAULT_BRANCH,
          output: result,
        });
      } catch (memoryError) {
        console.warn(`[${workflowId}] Failed to save temporary batch summary`, memoryError);
      }
    });
  };

  const triggerBatchWorkflow = () => {
    if (isTriggering) return;

    const targets = buildRepositoryTargets();
    if (!targets) return;

    const workflowIdByIndex = new Map<number, string>();
    const repoIndexByWorkflowId = new Map<string, number>();
    const startTime = new Date().toISOString();
    const nextWorkflows: WorkflowInstance[] = targets.map((target, index) => {
      const id = generateWorkflowId(index);
      workflowIdByIndex.set(index, id);
      repoIndexByWorkflowId.set(id, index);

      return {
        id,
        repoUrl: target.repo_url,
        repoIndex: index,
        branch: target.branch || DEFAULT_BRANCH,
        triggeredBy: DEFAULT_TRIGGERED_BY,
        workflowType: 'repo_remediation',
        status: 'pending',
        currentStep: 0,
        steps: cloneSteps(initialSteps),
        events: [],
        startTime,
        isExpanded: index === 0,
      };
    });

    setWorkflows(prev => [...nextWorkflows, ...prev]);
    setBatchError(null);
    setBatchMessage(`Batch queued for ${targets.length} ${targets.length === 1 ? 'repository' : 'repositories'}.`);
    setIsTriggering(true);

    batchStreamRef.current?.close();
    batchStreamRef.current = WorkflowAPIClient.triggerBatchWorkflow(
      {
        repositories: targets,
        max_concurrency: DEFAULT_MAX_CONCURRENCY,
        triggered_by: DEFAULT_TRIGGERED_BY,
      },
      (event: WorkflowEvent) => {
        console.log('[ExecuteWorkflow] Batch event received:', event);

        if (event.event === 'batch_started') {
          const totalRepositories =
            'total_repositories' in event ? event.total_repositories : targets.length;
          setBatchMessage(
            `Batch started for ${totalRepositories} repositories.`
          );
          return;
        }

        if (event.event === 'batch_completed') {
          applyBatchCompleted(event, workflowIdByIndex, repoIndexByWorkflowId, targets);
          return;
        }

        const repoIndex = getScopedRepoIndex(event, targets);
        if (repoIndex === undefined) {
          return;
        }

        const workflowId = workflowIdByIndex.get(repoIndex);
        const target = targets[repoIndex];
        if (!workflowId || !target) {
          return;
        }

        applyRepoEvent(workflowId, target, event);
      },
      (error: Error) => {
        console.error('[ExecuteWorkflow] Batch stream error:', error);
        setBatchError(error.message);
        setBatchMessage(null);
        setIsTriggering(false);
        setWorkflows(prev => prev.map(wf =>
          repoIndexByWorkflowId.has(wf.id) ? { ...wf, status: 'failed' } : wf
        ));
      },
      () => {
        console.log('[ExecuteWorkflow] Batch stream completed');
        setIsTriggering(false);
      }
    );
  };

  const removeWorkflow = (workflowId: string) => {
    const workflow = workflows.find(wf => wf.id === workflowId);
    workflow?.eventSource?.close();
    setWorkflows(prev => prev.filter(wf => wf.id !== workflowId));
  };

  const toggleWorkflowExpand = (workflowId: string) => {
    setWorkflows(prev => prev.map(wf =>
      wf.id === workflowId ? { ...wf, isExpanded: !wf.isExpanded } : wf
    ));
  };

  const runningCount = workflows.filter(w => w.status === 'running').length;
  const completedCount = workflows.filter(w => w.status === 'completed').length;
  const failedCount = workflows.filter(w => w.status === 'failed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white">
      <div className="sticky top-0 z-40 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <button
            type="button"
            onClick={() => router.push('/workflows')}
            className="mb-4 inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm transition-colors hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workflows
          </button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Execute Workflows</h1>
              <p className="text-sm text-gray-400">Run single workflows, infrastructure scans, or batch repository remediation</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(prev => !prev)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3 font-semibold transition-all hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="h-5 w-5" />
              Add Workflow
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {workflows.length === 0 && (
          <div className="mb-6 rounded-lg border border-purple-500/30 bg-gradient-to-r from-gray-800/80 via-purple-500/10 to-gray-800/80 px-5 py-4 shadow-lg shadow-purple-950/20 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-200">
                <Play className="h-5 w-5" />
              </div>
              <p className="text-sm text-gray-200">
                Start a single workflow, infrastructure scan, or repository batch to begin live tracking.
              </p>
            </div>
          </div>
        )}

        {showAddForm && (
          <section className="mb-6 rounded-lg border border-gray-700 bg-gray-800/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-xl font-semibold">New Workflow</h2>
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, workflow_type: 'repo_remediation' })}
                className={`rounded-lg border p-4 text-left transition-all ${
                  formData.workflow_type === 'repo_remediation'
                    ? 'border-purple-500 bg-purple-500/15 text-white'
                    : 'border-gray-700 bg-gray-900/70 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold">Repository remediation</div>
                <div className="mt-1 text-xs text-gray-400">Run one repository through scan, issues, remediation, validation, and PR creation.</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, workflow_type: 'infrastructure_scan' })}
                className={`rounded-lg border p-4 text-left transition-all ${
                  formData.workflow_type === 'infrastructure_scan'
                    ? 'border-blue-500 bg-blue-500/15 text-white'
                    : 'border-gray-700 bg-gray-900/70 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold">Infrastructure scan</div>
                <div className="mt-1 text-xs text-gray-400">Run the IaC or Kubernetes scan flow from main.</div>
              </button>
            </div>

            {formData.workflow_type === 'repo_remediation' ? (
              <div className="mb-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Repository URL *
                    </label>
                    <input
                      type="text"
                      value={formData.repo_url}
                      onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                      placeholder="https://github.com/user/repo"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Branch
                    </label>
                    <input
                      type="text"
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                      placeholder="main"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Triggered By
                    </label>
                    <input
                      type="text"
                      value={formData.triggered_by}
                      onChange={(e) => setFormData({ ...formData, triggered_by: e.target.value })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                      placeholder="ui"
                    />
                  </div>
                </div>
                <RepositoryAccessFields
                  access={formData.repo_repository_access}
                  provider={formData.repo_auth_provider}
                  authMethod={formData.repo_auth_method}
                  credentialReference={formData.repo_credential_reference}
                  username={formData.repo_username}
                  installationId={formData.repo_installation_id}
                  accessToken={formData.repo_access_token}
                  sshPrivateKey={formData.repo_ssh_private_key}
                  onChange={(changes) => setFormData({
                    ...formData,
                    repo_repository_access: changes.repository_access ?? formData.repo_repository_access,
                    repo_auth_provider: changes.auth_provider ?? formData.repo_auth_provider,
                    repo_auth_method: changes.auth_method ?? formData.repo_auth_method,
                    repo_credential_reference: changes.credential_reference ?? formData.repo_credential_reference,
                    repo_username: changes.username ?? formData.repo_username,
                    repo_installation_id: changes.installation_id ?? formData.repo_installation_id,
                    repo_access_token: changes.access_token ?? formData.repo_access_token,
                    repo_ssh_private_key: changes.ssh_private_key ?? formData.repo_ssh_private_key,
                  })}
                />
              </div>
            ) : (
              <div className="mb-4 space-y-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, infrastructure_target: 'repo' })}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      formData.infrastructure_target === 'repo'
                        ? 'border-cyan-500 bg-cyan-500/15 text-white'
                        : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium">Repo IaC scan</div>
                    <div className="mt-1 text-xs text-gray-400">Scan Kubernetes manifests, Helm charts, Terraform, or policy files from a repo.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, infrastructure_target: 'kubernetes_cluster' })}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      formData.infrastructure_target === 'kubernetes_cluster'
                        ? 'border-cyan-500 bg-cyan-500/15 text-white'
                        : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium">Kubernetes cluster scan</div>
                    <div className="mt-1 text-xs text-gray-400">Scan live cluster RBAC, pod security, namespaces, policies, and workload posture.</div>
                  </button>
                </div>

                {formData.infrastructure_target === 'repo' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">Infrastructure Repo URL *</label>
                        <input
                          type="text"
                          value={formData.iac_repo_url}
                          onChange={(e) => setFormData({ ...formData, iac_repo_url: e.target.value })}
                          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="https://github.com/company/infrastructure"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">Branch</label>
                        <input
                          type="text"
                          value={formData.iac_branch}
                          onChange={(e) => setFormData({ ...formData, iac_branch: e.target.value })}
                          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="main"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">Manifest or IaC Path</label>
                        <input
                          type="text"
                          value={formData.iac_path}
                          onChange={(e) => setFormData({ ...formData, iac_path: e.target.value })}
                          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="k8s/overlays/prod"
                        />
                      </div>
                    </div>
                    <RepositoryAccessFields
                      access={formData.iac_repository_access}
                      provider={formData.iac_auth_provider}
                      authMethod={formData.iac_auth_method}
                      credentialReference={formData.iac_credential_reference}
                      username={formData.iac_username}
                      installationId={formData.iac_installation_id}
                      accessToken={formData.iac_access_token}
                      sshPrivateKey={formData.iac_ssh_private_key}
                      onChange={(changes) => setFormData({
                        ...formData,
                        iac_repository_access: changes.repository_access ?? formData.iac_repository_access,
                        iac_auth_provider: changes.auth_provider ?? formData.iac_auth_provider,
                        iac_auth_method: changes.auth_method ?? formData.iac_auth_method,
                        iac_credential_reference: changes.credential_reference ?? formData.iac_credential_reference,
                        iac_username: changes.username ?? formData.iac_username,
                        iac_installation_id: changes.installation_id ?? formData.iac_installation_id,
                        iac_access_token: changes.access_token ?? formData.iac_access_token,
                        iac_ssh_private_key: changes.ssh_private_key ?? formData.iac_ssh_private_key,
                      })}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">Cluster Name *</label>
                      <input
                        type="text"
                        value={formData.cluster_name}
                        onChange={(e) => setFormData({ ...formData, cluster_name: e.target.value })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        placeholder="prod-eks-us-east-1"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">Kubeconfig Context *</label>
                      <input
                        type="text"
                        value={formData.kubeconfig_context}
                        onChange={(e) => setFormData({ ...formData, kubeconfig_context: e.target.value })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        placeholder="prod-admin"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">Namespace Scope</label>
                      <input
                        type="text"
                        value={formData.namespace}
                        onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        placeholder="all-namespaces"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">Cloud Provider</label>
                      <select
                        value={formData.cloud_provider}
                        onChange={(e) => setFormData({ ...formData, cloud_provider: e.target.value })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="aws">AWS</option>
                        <option value="azure">Azure</option>
                        <option value="gcp">GCP</option>
                        <option value="on-prem">On-prem</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">Compliance Profile</label>
                      <select
                        value={formData.compliance_profile}
                        onChange={(e) => setFormData({ ...formData, compliance_profile: e.target.value })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cis-kubernetes">CIS Kubernetes</option>
                        <option value="nsa-cisa">NSA/CISA</option>
                        <option value="pod-security-restricted">Pod Security Restricted</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">Timeout Seconds</label>
                      <input
                        type="number"
                        value={formData.timeout}
                        onChange={(e) => setFormData({ ...formData, timeout: e.target.value })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        min="60"
                        max="3600"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">Severity Levels</label>
                    <input
                      type="text"
                      value={formData.severity_levels}
                      onChange={(e) => setFormData({ ...formData, severity_levels: e.target.value })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="CRITICAL,HIGH,MEDIUM"
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.scan_rbac}
                      onChange={(e) => setFormData({ ...formData, scan_rbac: e.target.checked })}
                      className="h-4 w-4"
                    />
                    RBAC checks
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.scan_network_policies}
                      onChange={(e) => setFormData({ ...formData, scan_network_policies: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Network policies
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.scan_secrets}
                      onChange={(e) => setFormData({ ...formData, scan_secrets: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Secret exposure
                  </label>
                </div>

                {infrastructureMock?.input_requirements?.[formData.infrastructure_target] && (
                  <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
                    <div className="mb-3 text-sm font-semibold text-gray-200">
                      Required inputs from mock workflow
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {infrastructureMock.input_requirements[formData.infrastructure_target].map((item: any) => (
                        <div key={item.field} className="rounded border border-gray-800 bg-gray-950 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-gray-200">{item.label}</span>
                            <span className={`rounded px-2 py-1 text-xs ${item.required ? 'bg-red-500/10 text-red-300' : 'bg-gray-700 text-gray-300'}`}>
                              {item.required ? 'required' : 'optional'}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">{item.example}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={addNewWorkflow}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 font-semibold transition-all hover:from-purple-600 hover:to-pink-600"
              >
                <Play className="h-4 w-4" />
                Start Workflow
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg bg-gray-700 px-6 py-2 font-semibold transition-all hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        <section className="mb-6 rounded-lg border border-gray-700 bg-gray-800/50 p-6 backdrop-blur-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Batch Repository Remediation</h2>
              <p className="text-sm text-gray-400">Add repository targets, then start the backend batch workflow.</p>
            </div>
            <button
              type="button"
              onClick={addRepositoryInput}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Add Repository
            </button>
          </div>

          <div className="space-y-3">
            {repositoryInputs.map((input, index) => (
              <div
                key={input.id}
                className="rounded-lg border border-gray-700 bg-gray-900/70 p-4"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_140px_220px_44px]">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Repository URL {index + 1}
                    </label>
                    <input
                      type="text"
                      value={input.repo_url}
                      onChange={(e) => updateRepositoryInput(input.id, { repo_url: e.target.value })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                      placeholder="https://github.com/user/repo"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Branch
                    </label>
                    <select
                      value={input.branch || DEFAULT_BRANCH}
                      onChange={(e) => updateRepositoryInput(input.id, { branch: e.target.value })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={DEFAULT_BRANCH}>main</option>
                    </select>
                  </div>
                  <fieldset>
                    <legend className="mb-2 block text-sm font-medium text-gray-300">
                      Access
                    </legend>
                    <div className="inline-flex h-10 w-full rounded-lg border border-gray-700 bg-gray-950 p-1">
                      <label
                        className={`flex flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-xs font-semibold transition-colors ${
                          input.repository_access === 'public'
                            ? 'bg-purple-500 text-white'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`repository-access-${input.id}`}
                          value="public"
                          checked={input.repository_access === 'public'}
                          onChange={() => updateRepositoryInput(input.id, {
                            repository_access: 'public',
                            access_token: '',
                            ssh_private_key: '',
                          })}
                          className="sr-only"
                        />
                        Public
                      </label>
                      <label
                        className={`flex flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-xs font-semibold transition-colors ${
                          input.repository_access === 'private'
                            ? 'bg-purple-500 text-white'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`repository-access-${input.id}`}
                          value="private"
                          checked={input.repository_access === 'private'}
                          onChange={() => updateRepositoryInput(input.id, {
                            repository_access: 'private',
                            auth_method: 'personal_access_token',
                          })}
                          className="sr-only"
                        />
                        Private
                      </label>
                    </div>
                  </fieldset>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeRepositoryInput(input.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-gray-300 transition-colors hover:bg-red-600 hover:text-white"
                      aria-label={`Remove repository ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {input.repository_access === 'private' && (
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">
                        Git provider
                      </label>
                      <select
                        value={input.auth_provider}
                        onChange={(event) => updateRepositoryInput(input.id, { auth_provider: event.target.value })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="github">GitHub</option>
                        <option value="gitlab">GitLab</option>
                        <option value="bitbucket">Bitbucket</option>
                        <option value="azure_devops">Azure DevOps</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">
                        Auth method
                      </label>
                      <select
                        value={input.auth_method}
                        onChange={(event) => updateRepositoryInput(input.id, { auth_method: event.target.value as PrivateRepoAuthMethod })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="personal_access_token">Secret token</option>
                        <option value="credential_reference">Secret reference</option>
                        <option value="github_app">GitHub App</option>
                        <option value="ssh_deploy_key">SSH deploy key</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">
                        Username or owner
                      </label>
                      <input
                        type="text"
                        value={input.username}
                        onChange={(event) => updateRepositoryInput(input.id, { username: event.target.value })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                        placeholder="org or service account"
                      />
                    </div>
                    {input.auth_method === 'personal_access_token' && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Secret token
                        </label>
                        <input
                          type="password"
                          value={input.access_token}
                          onChange={(event) => updateRepositoryInput(input.id, { access_token: event.target.value })}
                          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter secret token"
                          autoComplete="off"
                        />
                      </div>
                    )}
                    {input.auth_method === 'credential_reference' && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Secret reference
                        </label>
                        <input
                          type="text"
                          value={input.credential_reference}
                          onChange={(event) => updateRepositoryInput(input.id, { credential_reference: event.target.value })}
                          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                          placeholder="vault/github/prod-readonly"
                        />
                      </div>
                    )}
                    {input.auth_method === 'github_app' && (
                      <>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-300">
                            Installation ID
                          </label>
                          <input
                            type="text"
                            value={input.installation_id}
                            onChange={(event) => updateRepositoryInput(input.id, { installation_id: event.target.value })}
                            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                            placeholder="12345678"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-300">
                            Secret reference
                          </label>
                          <input
                            type="text"
                            value={input.credential_reference}
                            onChange={(event) => updateRepositoryInput(input.id, { credential_reference: event.target.value })}
                            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                            placeholder="vault/github-app/prod"
                          />
                        </div>
                      </>
                    )}
                    {input.auth_method === 'ssh_deploy_key' && (
                      <div className="md:col-span-3">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          SSH private key
                        </label>
                        <textarea
                          value={input.ssh_private_key}
                          onChange={(event) => updateRepositoryInput(input.id, { ssh_private_key: event.target.value })}
                          className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                          placeholder="Use a credential reference when possible"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {batchError && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {batchError}
            </div>
          )}
          {batchMessage && !batchError && (
            <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
              {batchMessage}
            </div>
          )}

          <div className="mt-5">
            <button
              type="button"
              onClick={triggerBatchWorkflow}
              disabled={isTriggering}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold transition-all hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Play className="h-5 w-5" />
              {isTriggering ? 'Triggering Batch...' : 'Trigger Batch'}
            </button>
          </div>
        </section>

        {workflows.length > 0 && (
          <div className="space-y-4">
            {workflows.map(workflow => (
              <WorkflowCard
                key={workflow.id}
                id={workflow.id}
                repoUrl={workflow.repoUrl}
                branch={workflow.branch}
                status={workflow.status}
                currentStep={workflow.currentStep}
                steps={workflow.steps}
                events={workflow.events}
                startTime={workflow.startTime}
                onClose={() => removeWorkflow(workflow.id)}
                isExpanded={workflow.isExpanded}
                onToggleExpand={() => toggleWorkflowExpand(workflow.id)}
              />
            ))}
          </div>
        )}

        {workflows.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-purple-400">{workflows.length}</div>
              <div className="text-sm text-gray-400">Total Workflows</div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-yellow-400">{runningCount}</div>
              <div className="text-sm text-gray-400">Running</div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-green-400">{completedCount}</div>
              <div className="text-sm text-gray-400">Completed</div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-red-400">{failedCount}</div>
              <div className="text-sm text-gray-400">Failed</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
