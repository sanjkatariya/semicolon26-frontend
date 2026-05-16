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
  status: 'running' | 'completed' | 'failed' | 'pending';
  currentStep: number;
  steps: ExecutionStep[];
  events: WorkflowEvent[];
  startTime: string;
  eventSource?: EventSource;
  isExpanded: boolean;
}

const initialSteps: ExecutionStep[] = [
  { id: 1, name: 'Repository Scan', agent: 'scanner_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 2, name: 'GitHub Issues', agent: 'github_issue_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 3, name: 'Vulnerability Analysis', agent: 'analysis_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 4, name: 'Remediation', agent: 'remediation_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 5, name: 'Validation', agent: 'validation_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 6, name: 'Pull Request', agent: 'pr_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
];

// Feature flag for mock data - controlled via .env.local
// Set NEXT_PUBLIC_ENABLE_MOCK_DATA=true to enable mock/demo data
const ENABLE_MOCK_DATA = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true';

export default function ExecuteWorkflowPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    repo_url: ENABLE_MOCK_DATA ? 'https://github.com/kim815/vulnerable-repo' : '',
    branch: ENABLE_MOCK_DATA ? 'main' : '',
    triggered_by: 'ui'
  });

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

  const addNewWorkflow = () => {
    if (!formData.repo_url.trim()) {
      alert('Please enter a repository URL');
      return;
    }

    const workflowId = generateWorkflowId();
    const newWorkflow: WorkflowInstance = {
      id: workflowId,
      repoUrl: formData.repo_url,
      branch: formData.branch || 'main',
      triggeredBy: formData.triggered_by || 'ui',
      status: 'pending',
      currentStep: 0,
      steps: JSON.parse(JSON.stringify(initialSteps)),
      events: [],
      startTime: new Date().toISOString(),
      isExpanded: true
    };

    setWorkflows(prev => [...prev, newWorkflow]);
    setShowAddForm(false);
    
    // Start workflow execution
    executeWorkflow(workflowId, newWorkflow);
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
