'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Play, Trash2 } from 'lucide-react';
import { WorkflowAPIClient } from '@/lib/workflow-api';
import { WorkflowEvent, WorkflowRepositoryRequest } from '@/types/workflow-execution';
import WorkflowCard from '@/components/WorkflowCard';
import { rememberAgentResult } from '@/lib/workflow-memory';

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

function createRepositoryInput(repoUrl = '', branch = DEFAULT_BRANCH): RepositoryInput {
  return {
    id: generateInputId(),
    repo_url: repoUrl,
    branch,
  };
}

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

export default function ExecuteWorkflowPage() {
  const router = useRouter();
  const batchStreamRef = useRef<EventSource | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [repositoryInputs, setRepositoryInputs] = useState<RepositoryInput[]>([
    createRepositoryInput(
      ENABLE_MOCK_DATA ? 'https://github.com/kim815/vulnerable-repo' : '',
      DEFAULT_BRANCH
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
    infrastructure_target: 'kubernetes_cluster' as InfrastructureTargetType,
    iac_repo_url: 'https://github.com/company/infrastructure',
    iac_branch: DEFAULT_BRANCH,
    iac_path: 'k8s/overlays/prod',
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

    const targets = repositoryInputs.map(input => ({
      repo_url: input.repo_url.trim(),
      branch: input.branch.trim() || DEFAULT_BRANCH,
      commit_sha: 'HEAD',
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
              input: { repository_url: target.repo_url, branch: target.branch || DEFAULT_BRANCH },
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
    const target = {
      repo_url: workflow.repoUrl,
      branch: workflow.branch || DEFAULT_BRANCH,
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

    if (formData.workflow_type === 'infrastructure_scan') {
      if (formData.infrastructure_target === 'repo' && !formData.iac_repo_url.trim()) {
        alert('Please enter an infrastructure repository URL');
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
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                className="grid grid-cols-1 gap-3 rounded-lg border border-gray-700 bg-gray-900/70 p-4 md:grid-cols-[minmax(0,1fr)_180px_44px]"
              >
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
                  <input
                    type="text"
                    value={input.branch}
                    onChange={(e) => updateRepositoryInput(input.id, { branch: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                    placeholder="main"
                  />
                </div>
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

        {workflows.length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-12 text-center backdrop-blur-sm">
            <h3 className="mb-2 text-xl font-semibold">No Workflow Runs</h3>
            <p className="text-gray-400">Start a single workflow, infrastructure scan, or repository batch to begin live tracking.</p>
          </div>
        ) : (
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
