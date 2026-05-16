'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowAPIClient } from '@/lib/workflow-api';
import { WorkflowEvent } from '@/types/workflow-execution';
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

// Feature flag for mock data - controlled via .env.local
// Set NEXT_PUBLIC_ENABLE_MOCK_DATA=true to enable mock/demo data
const ENABLE_MOCK_DATA = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true';

export default function ExecuteWorkflowPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [infrastructureMock, setInfrastructureMock] = useState<any>(null);
  const [formData, setFormData] = useState({
    workflow_type: 'repo_remediation' as 'repo_remediation' | 'infrastructure_scan',
    repo_url: ENABLE_MOCK_DATA ? 'https://github.com/kim815/vulnerable-repo' : '',
    branch: ENABLE_MOCK_DATA ? 'main' : '',
    triggered_by: 'ui',
    infrastructure_target: 'kubernetes_cluster' as InfrastructureTargetType,
    iac_repo_url: 'https://github.com/company/infrastructure',
    iac_branch: 'main',
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
    timeout: '600'
  });

  useEffect(() => {
    fetch('/mock-data/infrastructure-scan.json')
      .then(res => res.json())
      .then(setInfrastructureMock)
      .catch(error => console.error('Error loading infrastructure scan mock data:', error));
  }, []);

  // Cleanup on unmount ONLY (empty dependency array)
  useEffect(() => {
    return () => {
      // This only runs when component unmounts
      console.log('[ExecuteWorkflow] Component unmounting, closing all connections');
      // We need to access the latest workflows state
      setWorkflows(currentWorkflows => {
        currentWorkflows.forEach(wf => {
          if (wf.eventSource) {
            console.log(`[ExecuteWorkflow] Closing connection for workflow ${wf.id}`);
            wf.eventSource.close();
          }
        });
        return currentWorkflows;
      });
    };
  }, []); // Empty array = only run on mount/unmount

  const generateWorkflowId = () => {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      repoUrl: isInfrastructureScan ? getInfrastructureTargetLabel() : formData.repo_url,
      branch: isInfrastructureScan ? getInfrastructureBranchLabel() : formData.branch || 'main',
      triggeredBy: formData.triggered_by || 'ui',
      workflowType: formData.workflow_type,
      status: 'pending',
      currentStep: 0,
      steps: JSON.parse(JSON.stringify(
        isInfrastructureScan
          ? formData.infrastructure_target === 'repo'
            ? infrastructureRepoSteps
            : infrastructureSteps
          : initialSteps
      )),
      events: [],
      startTime: new Date().toISOString(),
      isExpanded: true
    };

    setWorkflows(prev => [...prev, newWorkflow]);
    setShowAddForm(false);
    
    // Start workflow execution
    if (isInfrastructureScan) {
      void executeInfrastructureWorkflow(workflowId, newWorkflow, formData.infrastructure_target, infrastructureInput);
    } else {
      executeWorkflow(workflowId, newWorkflow);
    }
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
    // Update status to running
    setWorkflows(prev => prev.map(wf => 
      wf.id === workflowId ? { ...wf, status: 'running' } : wf
    ));

    try {
      console.log(`[${workflowId}] Starting workflow execution...`);
      
      const eventSource = WorkflowAPIClient.triggerWorkflow(
        {
          repo_url: workflow.repoUrl,
          branch: workflow.branch,
          triggered_by: workflow.triggeredBy
        },
        (event: WorkflowEvent) => {
          console.log(`[${workflowId}] Event received:`, event);

          if (event.event === 'agent_status' && event.agent && (event.status === 'completed' || event.status === 'failed')) {
            try {
              const stepName = initialSteps.find(step => step.agent === event.agent)?.name || event.agent;
              rememberAgentResult({
                workflowId,
                agent: event.agent,
                stepName,
                status: event.status,
                timestamp: event.timestamp,
                repoUrl: workflow.repoUrl,
                branch: workflow.branch,
                output: event.status === 'failed'
                  ? { error: event.error?.message || 'Unknown error' }
                  : event.data || {},
              });
            } catch (memoryError) {
              console.warn(`[${workflowId}] Failed to save temporary agent result`, memoryError);
            }
          }
          
          // Add event to workflow
          setWorkflows(prev => prev.map(wf => {
            if (wf.id !== workflowId) return wf;
            
            const updatedEvents = [...wf.events, event];
            let updatedSteps = [...wf.steps];
            let updatedStatus = wf.status;
            let updatedCurrentStep = wf.currentStep;

            // Update steps based on event
            if (event.event === 'agent_status' && 'agent' in event && event.agent) {
              const agentIndex = updatedSteps.findIndex(s => s.agent === event.agent);
              if (agentIndex !== -1) {
                if (event.status === 'started') {
                  updatedCurrentStep = agentIndex;
                  updatedSteps[agentIndex] = {
                    ...updatedSteps[agentIndex],
                    status: 'running',
                    startTime: event.timestamp,
                    progress: 50,
                    input: { repository_url: workflow.repoUrl, branch: workflow.branch }
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
                    output: event.data || {}
                  };
                } else if (event.status === 'failed') {
                  updatedSteps[agentIndex] = {
                    ...updatedSteps[agentIndex],
                    status: 'failed',
                    endTime: event.timestamp,
                    progress: 100,
                    output: { error: event.error?.message || 'Unknown error' }
                  };
                  updatedStatus = 'failed';
                }
              }
            } else if (event.event === 'workflow_completed') {
              const workflowStatus = event.status === 'failed' ? 'failed' : 'completed';
              const workflowSummary = 'summary' in event ? event.summary : undefined;
              updatedStatus = workflowStatus;
              try {
                rememberAgentResult({
                  workflowId,
                  agent: 'workflow',
                  stepName: 'Workflow Summary',
                  status: workflowStatus,
                  timestamp: event.timestamp,
                  repoUrl: workflow.repoUrl,
                  branch: workflow.branch,
                  output: workflowSummary || event.data || {},
                });
              } catch (memoryError) {
                console.warn(`[${workflowId}] Failed to save temporary workflow summary`, memoryError);
              }
            }

            return {
              ...wf,
              events: updatedEvents,
              steps: updatedSteps,
              status: updatedStatus,
              currentStep: updatedCurrentStep
            };
          }));
        },
        // Error callback
        (error: Error) => {
          console.error(`[${workflowId}] Stream error:`, error);
          setWorkflows(prev => prev.map(wf =>
            wf.id === workflowId ? { ...wf, status: 'failed' } : wf
          ));
        },
        // Complete callback
        () => {
          console.log(`[${workflowId}] Stream completed`);
        }
      );

      // Store event source for cleanup
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

  const removeWorkflow = (workflowId: string) => {
    const workflow = workflows.find(wf => wf.id === workflowId);
    if (workflow?.eventSource) {
      workflow.eventSource.close();
    }
    setWorkflows(prev => prev.filter(wf => wf.id !== workflowId));
  };

  const toggleWorkflowExpand = (workflowId: string) => {
    setWorkflows(prev => prev.map(wf => 
      wf.id === workflowId ? { ...wf, isExpanded: !wf.isExpanded } : wf
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push('/workflows')}
            className="mb-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
          >
            ← Back to Workflows
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                🚀
              </div>
              <div>
                <h1 className="text-2xl font-bold">Execute Workflows</h1>
                <p className="text-sm text-gray-400">Run multiple workflows simultaneously</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              <span className="text-xl">+</span> Add Workflow
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Add Workflow Form */}
        {showAddForm && (
          <div className="mb-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4">New Workflow</h2>
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                onClick={() => setFormData({ ...formData, workflow_type: 'repo_remediation' })}
                className={`rounded-lg border p-4 text-left transition-all ${
                  formData.workflow_type === 'repo_remediation'
                    ? 'border-purple-500 bg-purple-500/15 text-white'
                    : 'border-gray-700 bg-gray-900/70 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold">Repository remediation</div>
                <div className="mt-1 text-xs text-gray-400">Existing repo scan, issues, remediation, validation, and PR workflow.</div>
              </button>
              <button
                onClick={() => setFormData({ ...formData, workflow_type: 'infrastructure_scan' })}
                className={`rounded-lg border p-4 text-left transition-all ${
                  formData.workflow_type === 'infrastructure_scan'
                    ? 'border-blue-500 bg-blue-500/15 text-white'
                    : 'border-gray-700 bg-gray-900/70 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold">Infrastructure scan</div>
                <div className="mt-1 text-xs text-gray-400">Mock IaC or Kubernetes cluster scan with 4 focused agents.</div>
              </button>
            </div>

            {formData.workflow_type === 'repo_remediation' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Repository URL *
                  </label>
                  <input
                    type="text"
                    value={formData.repo_url}
                    onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://github.com/user/repo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="main"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Triggered By
                  </label>
                  <input
                    type="text"
                    value={formData.triggered_by}
                    onChange={(e) => setFormData({ ...formData, triggered_by: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="ui"
                  />
                </div>
              </div>
            ) : (
              <div className="mb-4 space-y-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
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
                      <label className="block text-sm font-medium text-gray-300 mb-2">Infrastructure Repo URL *</label>
                      <input
                        type="text"
                        value={formData.iac_repo_url}
                        onChange={(e) => setFormData({ ...formData, iac_repo_url: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://github.com/company/infrastructure"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Branch</label>
                      <input
                        type="text"
                        value={formData.iac_branch}
                        onChange={(e) => setFormData({ ...formData, iac_branch: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="main"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Manifest or IaC Path</label>
                      <input
                        type="text"
                        value={formData.iac_path}
                        onChange={(e) => setFormData({ ...formData, iac_path: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="k8s/overlays/prod"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Cluster Name *</label>
                      <input
                        type="text"
                        value={formData.cluster_name}
                        onChange={(e) => setFormData({ ...formData, cluster_name: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="prod-eks-us-east-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Kubeconfig Context *</label>
                      <input
                        type="text"
                        value={formData.kubeconfig_context}
                        onChange={(e) => setFormData({ ...formData, kubeconfig_context: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="prod-admin"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Namespace Scope</label>
                      <input
                        type="text"
                        value={formData.namespace}
                        onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="all-namespaces"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Cloud Provider</label>
                      <select
                        value={formData.cloud_provider}
                        onChange={(e) => setFormData({ ...formData, cloud_provider: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="aws">AWS</option>
                        <option value="azure">Azure</option>
                        <option value="gcp">GCP</option>
                        <option value="on-prem">On-prem</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Compliance Profile</label>
                      <select
                        value={formData.compliance_profile}
                        onChange={(e) => setFormData({ ...formData, compliance_profile: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="cis-kubernetes">CIS Kubernetes</option>
                        <option value="nsa-cisa">NSA/CISA</option>
                        <option value="pod-security-restricted">Pod Security Restricted</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Timeout Seconds</label>
                      <input
                        type="number"
                        value={formData.timeout}
                        onChange={(e) => setFormData({ ...formData, timeout: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="60"
                        max="3600"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Severity Levels</label>
                    <input
                      type="text"
                      value={formData.severity_levels}
                      onChange={(e) => setFormData({ ...formData, severity_levels: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="flex gap-3">
              <button
                onClick={addNewWorkflow}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold transition-all"
              >
                Start Workflow
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Workflows List */}
        {workflows.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">No Active Workflows</h3>
            <p className="text-gray-400 mb-6">Click "Add Workflow" to start a new security scan</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold transition-all inline-flex items-center gap-2"
            >
              <span className="text-xl">+</span> Add Your First Workflow
            </button>
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

        {/* Stats */}
        {workflows.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
              <div className="text-2xl font-bold text-purple-400">{workflows.length}</div>
              <div className="text-sm text-gray-400">Total Workflows</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {workflows.filter(w => w.status === 'running').length}
              </div>
              <div className="text-sm text-gray-400">Running</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
              <div className="text-2xl font-bold text-green-400">
                {workflows.filter(w => w.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-400">Completed</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
              <div className="text-2xl font-bold text-red-400">
                {workflows.filter(w => w.status === 'failed').length}
              </div>
              <div className="text-sm text-gray-400">Failed</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob
