'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { rememberAgentResult } from '@/lib/workflow-memory';

interface WorkflowStep {
  step_id: string;
  step_name: string;
  step_type: string;
  agent_id?: string;
  agent_name?: string;
  status: string;
  input: any;
  output: any;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  retry_count: number;
}

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  triggered_by: string;
  trigger_data: any;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  steps: WorkflowStep[];
  summary: {
    total_steps: number;
    completed_steps: number;
    failed_steps: number;
    skipped_steps: number;
    vulnerabilities_processed: number;
    remediation_plans_created: number;
    pull_requests_created: number;
    notifications_sent: number;
  };
  metrics: {
    mean_time_to_remediate_minutes: number;
    automation_rate: number;
    success_rate: number;
  };
}

interface ExecutionStep {
  id: number;
  name: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration: number;
  output: any;
  progress: number;
  startTime?: string;
  endTime?: string;
}

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);

  const [steps, setSteps] = useState<ExecutionStep[]>([
    {
      id: 1,
      name: 'Scanner',
      agent: 'scanner_agent',
      status: 'pending',
      duration: 0,
      progress: 0,
      output: {}
    },
    {
      id: 2,
      name: 'Analysis',
      agent: 'analysis_agent',
      status: 'pending',
      duration: 0,
      progress: 0,
      output: {}
    },
    {
      id: 3,
      name: 'Remediation',
      agent: 'remediation_agent',
      status: 'pending',
      duration: 0,
      progress: 0,
      output: {}
    },
    {
      id: 4,
      name: 'Validation',
      agent: 'validation_agent',
      status: 'pending',
      duration: 0,
      progress: 0,
      output: {}
    },
    {
      id: 5,
      name: 'Pull Request',
      agent: 'pr_agent',
      status: 'pending',
      duration: 0,
      progress: 0,
      output: {}
    }
  ]);

  const [formData, setFormData] = useState({
    repo_url: '',
    branch: 'main',
    triggered_by: 'ui'
  });

  useEffect(() => {
    // Load workflow data
    fetch('/mock-data/remediation-workflow.json')
      .then(res => res.json())
      .then(data => {
        const wf = data.workflow_execution;
        setWorkflow(wf);

        let repoUrl = '';
        let branchName = 'main';
        
        if (wf.trigger_data) {
          repoUrl = wf.trigger_data.repository || wf.trigger_data.repo_url || wf.trigger_data.repository_url || '';
          branchName = wf.trigger_data.branch || 'main';
        }
        
        if (!repoUrl && wf.steps && wf.steps.length > 0) {
          const firstStep = wf.steps[0];
          if (firstStep.input) {
            repoUrl = firstStep.input.repository_url || firstStep.input.repo_url || firstStep.input.repository || '';
            branchName = firstStep.input.branch || 'main';
          }
        }

        if (wf.steps && Array.isArray(wf.steps)) {
          wf.steps.forEach((step: WorkflowStep) => {
            try {
              rememberAgentResult({
                workflowId: wf.id,
                agent: step.agent_name || step.agent_id || step.step_type,
                stepName: step.step_name,
                status: step.status,
                timestamp: step.completed_at || step.started_at,
                repoUrl,
                branch: branchName,
                output: step.output || {},
              });
            } catch (memoryError) {
              console.warn('[WorkflowDetail] Failed to save temporary step result', memoryError);
            }
          });
        }
        
        // Pre-fill form with workflow data
        // Try to extract repo URL from various sources
        setFormData({
          repo_url: repoUrl,
          branch: branchName,
          triggered_by: wf.triggered_by || 'ui'
        });
        
        // Map workflow steps to execution steps for visualization
        if (wf.steps && Array.isArray(wf.steps)) {
          const mappedSteps = steps.map((step, index) => {
            const wfStep = wf.steps.find((candidate: WorkflowStep) => {
              const agent = candidate.agent_name || candidate.agent_id || candidate.step_type;
              return agent === step.agent;
            }) || wf.steps[index];
            if (wfStep) {
              return {
                ...step,
                status: wfStep.status as any,
                duration: Math.round(wfStep.duration_ms / 1000),
                output: wfStep.output || {},
                startTime: wfStep.started_at,
                endTime: wfStep.completed_at,
                progress: wfStep.status === 'completed' ? 100 : 0
              };
            }
            return step;
          });
          setSteps(mappedSteps);
        }
        
        // Set first step as selected by default
        if (wf.steps && wf.steps.length > 0) {
          setSelectedStep(wf.steps[0]);
        }
        
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading workflow:', err);
        setLoading(false);
      });
  }, [params.id]);

  const handleRetrigger = () => {
    // Redirect to execute page with pre-filled data
    const queryParams = new URLSearchParams({
      repo_url: formData.repo_url,
      branch: formData.branch
    });
    router.push(`/workflows/execute?${queryParams.toString()}`);
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'running':
        return 'bg-blue-500';
      default:
        return 'bg-gray-600';
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'failed':
        return '✕';
      case 'running':
        return '⚙';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'in_progress': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'pending': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '⚙️';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      default: return '○';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-white text-center py-20">Loading workflow...</div>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-400 text-center py-20">Workflow not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/workflows')}
            className="mb-2 px-3 py-1.5 text-sm bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded-lg transition-all flex items-center gap-2"
          >
            ← Back to Workflows
          </button>
          <h1 className="text-2xl font-bold text-white mb-1">⚙️ {workflow.workflow_name}</h1>
          <p className="text-sm text-gray-400">Workflow execution details and re-trigger</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Sidebar - Configuration Form */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 sticky top-4">
              <h2 className="text-lg font-bold text-white mb-3">📝 Workflow Configuration</h2>
              
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-gray-300 text-xs font-medium mb-1">
                    🔗 Repository URL
                  </label>
                  <input
                    type="text"
                    value={formData.repo_url}
                    onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="https://github.com/owner/repo"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-xs font-medium mb-1">
                    🌿 Branch
                  </label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="main"
                  />
                </div>
              </div>

              <button
                onClick={handleRetrigger}
                disabled={!formData.repo_url || !formData.branch}
                className={`w-full py-2 text-sm rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 ${
                  !formData.repo_url || !formData.branch
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/50'
                }`}
              >
                ▶ Re-trigger Workflow
              </button>

              {/* Workflow Info */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-400 space-y-2">
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <span className="text-gray-300 ml-1 font-mono">{workflow.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                      workflow.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      workflow.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {workflow.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Started:</span>
                    <span className="text-gray-300 ml-1">{new Date(workflow.started_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="text-gray-300 ml-1">{formatDuration(workflow.duration_ms)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Workflow Pipeline */}
          <div className="lg:col-span-3">
            <h2 className="text-lg font-bold text-white mb-3">🔄 Workflow Pipeline</h2>
            
            {/* Horizontal Pipeline Visualization */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 mb-4">
              <div className="flex items-center justify-between mb-8">
                {/* START */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xs">
                    START
                  </div>
                  <span className="text-xs text-gray-400 mt-2">Triggered</span>
                </div>

                {/* Steps */}
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center flex-1">
                    {/* Connecting Line */}
                    <div className={`h-1 flex-1 ${getStepColor(step.status)} transition-all duration-500`} />
                    
                    {/* Step Circle */}
                    <div className="flex flex-col items-center mx-2">
                      <div
                        className={`w-20 h-20 rounded-full ${getStepColor(step.status)} flex items-center justify-center transition-all duration-500`}
                      >
                        <span className="text-white text-2xl font-bold">
                          {step.status === 'completed' || step.status === 'failed' || step.status === 'running' 
                            ? getStepIcon(step.status) 
                            : index + 1}
                        </span>
                      </div>
                      <span className="text-xs text-white font-medium mt-2">{step.name}</span>
                      <span className="text-xs text-gray-400">{step.status}</span>
                    </div>
                  </div>
                ))}

                {/* END */}
                <div className="flex items-center flex-1">
                  <div className={`h-1 flex-1 ${steps.every(s => s.status === 'completed') ? 'bg-green-500' : 'bg-gray-600'} transition-all duration-500`} />
                  <div className="flex flex-col items-center ml-2">
                    <div className={`w-16 h-16 rounded-full ${steps.every(s => s.status === 'completed') ? 'bg-green-600' : 'bg-gray-600'} flex items-center justify-center text-white font-bold text-xs`}>
                      END
                    </div>
                    <span className="text-xs text-gray-400 mt-2">{workflow.status}</span>
                  </div>
                </div>
              </div>

              {/* Execution Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-700">
                <div>
                  <div className="text-xs text-gray-400">Repository</div>
                  <div className="text-sm text-white font-medium truncate">{formData.repo_url || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Branch</div>
                  <div className="text-sm text-white font-medium">{formData.branch}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Started</div>
                  <div className="text-sm text-white font-medium">
                    {new Date(workflow.started_at).toLocaleTimeString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Status</div>
                  <div className="text-sm text-white font-medium capitalize">{workflow.status}</div>
                </div>
              </div>
            </div>

            {/* All Steps List */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 mb-4">
              <h3 className="text-base font-bold text-white mb-3">📋 All Execution Steps</h3>
              <div className="space-y-2">
                {workflow.steps && Array.isArray(workflow.steps) && workflow.steps.map((step, index) => (
                  <div
                    key={step.step_id}
                    onClick={() => setSelectedStep(step)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedStep?.step_id === step.step_id 
                        ? 'bg-blue-500/20 border border-blue-500' 
                        : 'bg-gray-900/50 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          step.status === 'completed' ? 'bg-green-500 text-white' :
                          step.status === 'failed' ? 'bg-red-500 text-white' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">{step.step_name.replace(/_/g, ' ')}</div>
                          {step.agent_name && (
                            <div className="text-blue-400 text-xs">🤖 {step.agent_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{formatDuration(step.duration_ms)}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(step.status)}`}>
                          {getStatusIcon(step.status)} {step.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Step Details */}
            {selectedStep && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                <h3 className="text-base font-bold text-white mb-3">📄 Step Details: {selectedStep.step_name.replace(/_/g, ' ')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Input</div>
                    <div className="bg-gray-900/50 rounded p-2 max-h-48 overflow-y-auto">
                      <pre className="text-xs text-gray-300">
                        {JSON.stringify(selectedStep.input, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Output</div>
                    <div className="bg-gray-900/50 rounded p-2 max-h-48 overflow-y-auto">
                      <pre className="text-xs text-green-300">
                        {JSON.stringify(selectedStep.output, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
