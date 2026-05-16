'use client';

import { WorkflowEvent } from '@/types/workflow-execution';
import { buildAgentSummary, extractPullRequests, AgentSummaryTone } from '@/lib/workflow-memory';

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

interface StepDetailModalProps {
  step: ExecutionStep;
  events: WorkflowEvent[];
  onClose: () => void;
}

export default function StepDetailModal({ step, events, onClose }: StepDetailModalProps) {
  const summaryItems = buildAgentSummary(step.output);
  const pullRequests = extractPullRequests(step.output, {
    agent: step.agent,
    stepName: step.name,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'running': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'running': return '⟳';
      case 'failed': return '✗';
      default: return '○';
    }
  };

  const getSummaryToneClass = (tone: AgentSummaryTone = 'default') => {
    switch (tone) {
      case 'success': return 'border-green-500/30 bg-green-500/10 text-green-300';
      case 'warning': return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
      case 'danger': return 'border-red-500/30 bg-red-500/10 text-red-300';
      case 'info': return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
      default: return 'border-gray-700 bg-gray-950 text-gray-300';
    }
  };

  // Filter events related to this step
  const stepEvents = events.filter(e => 'agent' in e && e.agent === step.agent);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold">{step.name}</h2>
            <p className="text-sm text-gray-400 mt-1">Agent: {step.agent}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Section */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Status</h3>
            <div className="flex items-center gap-4">
              <div className={`text-3xl ${getStatusColor(step.status)}`}>
                {getStatusIcon(step.status)}
              </div>
              <div>
                <p className={`text-lg font-semibold ${getStatusColor(step.status)} capitalize`}>
                  {step.status}
                </p>
                {step.duration > 0 && (
                  <p className="text-sm text-gray-400">Duration: {step.duration}s</p>
                )}
                {step.startTime && (
                  <p className="text-xs text-gray-500">
                    Started: {new Date(step.startTime).toLocaleTimeString()}
                  </p>
                )}
                {step.endTime && (
                  <p className="text-xs text-gray-500">
                    Ended: {new Date(step.endTime).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Important Output Section */}
          {summaryItems.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Important Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {summaryItems.map(item => (
                  <div key={item.label} className={`border rounded-lg p-3 ${getSummaryToneClass(item.tone)}`}>
                    <div className="text-xs uppercase tracking-wide opacity-75">{item.label}</div>
                    <div className="text-lg font-bold mt-1">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Section */}
          {step.input && Object.keys(step.input).length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Input</h3>
              <pre className="text-xs text-gray-300 overflow-x-auto bg-gray-950 p-3 rounded">
                {JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output Section */}
          {step.output && Object.keys(step.output).length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Output</h3>
              <pre className="text-xs text-gray-300 overflow-x-auto bg-gray-950 p-3 rounded max-h-64">
                {JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          )}

          {/* PR Details Section */}
          {pullRequests.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">PR Details</h3>
              <div className="space-y-3">
                {pullRequests.map(pr => (
                  <div key={pr.id} className="border border-gray-700 bg-gray-950 rounded-lg p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-white font-semibold">
                          {pr.number ? `#${pr.number} ` : ''}{pr.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {[pr.branch, pr.status, pr.vulnerabilityId].filter(Boolean).join(' | ')}
                        </div>
                      </div>
                      {pr.url && (
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 whitespace-nowrap"
                        >
                          Open PR
                        </a>
                      )}
                    </div>

                    {(pr.reviewers.length > 0 || pr.labels.length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {pr.labels.map(label => (
                          <span key={label} className="px-2 py-1 rounded bg-purple-500/10 text-purple-300 text-xs border border-purple-500/20">
                            {label}
                          </span>
                        ))}
                        {pr.reviewers.map(reviewer => (
                          <span key={reviewer} className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 text-xs border border-blue-500/20">
                            {reviewer}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Events/Logs Section */}
          {stepEvents.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                Event Log ({stepEvents.length} events)
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stepEvents.map((event, idx) => (
                  <div key={idx} className="text-xs border-l-2 border-gray-700 pl-3 py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        event.status === 'started' ? 'bg-yellow-500/20 text-yellow-400' :
                        event.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        event.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                    {event.message && (
                      <p className="text-gray-400 mt-1">{event.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
