'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  trigger: string;
  repository: string;
  started_at: string;
  completed_at: string | null;
  duration: string;
  duration_ms: number;
  steps_total: number;
  steps_completed: number;
  vulnerabilities_fixed: number;
  prs_created: number;
  success_rate: number;
  triggered_by: string;
  error?: string;
  pending_approval?: {
    step: string;
    approvers: string[];
    waiting_since: string;
  };
}

interface WorkflowsData {
  workflows: Workflow[];
  summary: {
    total_workflows: number;
    completed: number;
    in_progress: number;
    failed: number;
    pending_approval: number;
    total_vulnerabilities_fixed: number;
    total_prs_created: number;
    average_duration_minutes: number;
    success_rate: number;
  };
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [data, setData] = useState<WorkflowsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/mock-data/workflows-list.json')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading workflows:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-white text-center py-20">Loading workflows...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-400 text-center py-20">Error loading workflows</div>
        </div>
      </div>
    );
  }

  const filteredWorkflows = filter === 'all' 
    ? data.workflows 
    : data.workflows.filter(w => w.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'in_progress': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'pending_approval': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'in_progress': return '⟳';
      case 'failed': return '✕';
      case 'pending_approval': return '⏸';
      default: return '○';
    }
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'vulnerability.detected': return '🔍';
      case 'scheduled': return '⏰';
      case 'manual': return '👤';
      case 'webhook': return '🔗';
      default: return '⚡';
    }
  };

  // Generate pipeline steps for visualization
  const getWorkflowSteps = (workflow: Workflow) => {
    const stepNames = ['Repository', 'Vulnerability', 'Remediation', 'Validation', 'Pull'];
    return stepNames.map((name, index) => ({
      name,
      status: index < workflow.steps_completed ? 'completed' : 
              index === workflow.steps_completed && workflow.status === 'in_progress' ? 'running' :
              workflow.status === 'failed' && index === workflow.steps_completed ? 'failed' : 'pending'
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">⚙️ Workflow Executions</h1>
            <p className="text-sm text-slate-400">Monitor and manage automated security workflows</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/workflows/create')}
              className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg shadow-lg shadow-purple-500/50 transition-all flex items-center gap-2"
            >
              🎨 Create Workflow
            </button>
            <button
              onClick={() => router.push('/workflows/execute')}
              className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-lg shadow-lg shadow-blue-500/50 transition-all flex items-center gap-2"
            >
              🚀 Execute Workflow
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-xs mb-1">Total Workflows</div>
            <div className="text-2xl font-bold text-white">{data.summary.total_workflows}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-xs mb-1">Success Rate</div>
            <div className="text-2xl font-bold text-green-400">{data.summary.success_rate}%</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-xs mb-1">Vulnerabilities Fixed</div>
            <div className="text-2xl font-bold text-blue-400">{data.summary.total_vulnerabilities_fixed}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-xs mb-1">PRs Created</div>
            <div className="text-2xl font-bold text-purple-400">{data.summary.total_prs_created}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            All ({data.summary.total_workflows})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
              filter === 'completed'
                ? 'bg-green-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            Completed ({data.summary.completed})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
              filter === 'in_progress'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            In Progress ({data.summary.in_progress})
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
              filter === 'failed'
                ? 'bg-red-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            Failed ({data.summary.failed})
          </button>
          <button
            onClick={() => setFilter('pending_approval')}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
              filter === 'pending_approval'
                ? 'bg-yellow-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            Pending ({data.summary.pending_approval})
          </button>
        </div>

        {/* Workflows List */}
        <div className="space-y-3">
          {filteredWorkflows.map((workflow) => {
            const steps = getWorkflowSteps(workflow);
            
            return (
              <div
                key={workflow.id}
                onClick={() => router.push(`/workflows/${workflow.id}`)}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                        {workflow.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(workflow.status)}`}>
                        {getStatusIcon(workflow.status)} {workflow.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">{workflow.description}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">ID:</span>
                        <span className="text-slate-300 font-mono">{workflow.id}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Repository:</span>
                        <span className="text-blue-400">{workflow.repository}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Trigger:</span>
                        <span className="text-slate-300">{getTriggerIcon(workflow.trigger)} {workflow.trigger}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-xs mb-0.5">Duration</div>
                    <div className="text-white font-bold text-base">{workflow.duration}</div>
                  </div>
                </div>

                {/* Horizontal Pipeline Visualization */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {steps.map((step, index) => (
                      <div key={index} className="flex items-center flex-shrink-0">
                        {/* Circle Node */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                              step.status === 'completed'
                                ? 'bg-green-500 border-green-400 text-white'
                                : step.status === 'running'
                                ? 'bg-blue-500 border-blue-400 text-white animate-pulse'
                                : step.status === 'failed'
                                ? 'bg-red-500 border-red-400 text-white'
                                : 'bg-slate-700 border-slate-600 text-slate-400'
                            }`}
                          >
                            {step.status === 'completed' ? '✓' : step.status === 'running' ? '⚙' : index + 1}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 text-center w-16 truncate">
                            {step.name}
                          </div>
                        </div>
                        
                        {/* Connecting Line */}
                        {index < steps.length - 1 && (
                          <div
                            className={`w-6 h-0.5 mx-0.5 transition-all ${
                              step.status === 'completed'
                                ? 'bg-green-500'
                                : step.status === 'running'
                                ? 'bg-blue-500'
                                : 'bg-slate-600'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Progress Info */}
                  <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-700/50">
                    <span className="text-slate-400">{workflow.steps_completed}/{workflow.steps_total} steps</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">🐛 Fixed: <span className="text-green-400 font-bold">{workflow.vulnerabilities_fixed}</span></span>
                      <span className="text-slate-500">📝 PRs: <span className="text-purple-400 font-bold">{workflow.prs_created}</span></span>
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">👤 {workflow.triggered_by}</span>
                    <span className="text-slate-500">🕐 {new Date(workflow.started_at).toLocaleString()}</span>
                  </div>
                  <span className="text-slate-500 group-hover:text-blue-400 transition-colors">
                    Click to view details →
                  </span>
                </div>

                {/* Error Message */}
                {workflow.error && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                    ❌ {workflow.error}
                  </div>
                )}

                {/* Pending Approval */}
                {workflow.pending_approval && (
                  <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400">
                    ⏸ {workflow.pending_approval.step} - Waiting for: {workflow.pending_approval.approvers.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredWorkflows.length === 0 && (
          <div className="text-center py-20">
            <div className="text-slate-400">No workflows found for this filter</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob
