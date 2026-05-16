'use client';

import { useState } from 'react';
import { WorkflowEvent } from '@/types/workflow-execution';
import StepDetailModal from './StepDetailModal';

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

interface WorkflowCardProps {
  id: string;
  repoUrl: string;
  branch: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  currentStep: number;
  steps: ExecutionStep[];
  events: WorkflowEvent[];
  startTime: string;
  onClose: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function WorkflowCard({
  id: _id,
  repoUrl,
  branch,
  status,
  currentStep,
  steps,
  events,
  startTime,
  onClose,
  isExpanded,
  onToggleExpand
}: WorkflowCardProps) {
  const [selectedStep, setSelectedStep] = useState<ExecutionStep | null>(null);

  const getRepoName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1] || url;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'running': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getNodeColor = (step: ExecutionStep, index: number) => {
    if (step.status === 'completed') {
      return 'bg-green-500 border-green-400';
    } else if (step.status === 'running') {
      return 'bg-yellow-500 border-yellow-400 animate-pulse';
    } else if (step.status === 'failed') {
      return 'bg-red-500 border-red-400';
    } else if (index < currentStep) {
      return 'bg-gray-600 border-gray-500';
    } else {
      return 'bg-gray-700 border-gray-600';
    }
  };

  const getConnectorColor = (index: number) => {
    if (index < 0) return 'bg-gray-700';
    const step = steps[index];
    if (step?.status === 'completed') {
      return 'bg-green-500';
    } else if (step?.status === 'running') {
      return 'bg-yellow-500';
    } else if (step?.status === 'failed') {
      return 'bg-red-500';
    }
    return 'bg-gray-700';
  };

  const getElapsedTime = () => {
    const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <>
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden transition-all">
        {/* Header */}
        <div 
          className="p-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
          onClick={onToggleExpand}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(status)}`}>
                {status.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{getRepoName(repoUrl)}</h3>
                <p className="text-xs text-gray-400 truncate">{branch}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status === 'running' && (
                <span className="text-xs text-gray-400">{getElapsedTime()}</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-red-600 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
              <button className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors">
                {isExpanded ? '▼' : '▶'}
              </button>
            </div>
          </div>

          {/* Compact Pipeline - Always Visible */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            {/* START Node */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-xs font-bold">
                ▶
              </div>
              <span className="text-[10px] text-gray-500">START</span>
            </div>

            {/* Pipeline Steps */}
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                {/* Connector */}
                <div className={`h-0.5 w-6 ${getConnectorColor(index - 1)} transition-all`} />
                
                {/* Step Node */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStep(step);
                    }}
                    className={`w-10 h-10 rounded-full border-2 ${getNodeColor(step, index)} flex items-center justify-center text-xs font-bold transition-all hover:scale-110`}
                  >
                    {step.status === 'completed' ? '✓' : 
                     step.status === 'running' ? '⟳' :
                     step.status === 'failed' ? '✗' : index + 1}
                  </button>
                  <span className="text-[10px] text-gray-500 max-w-[60px] truncate text-center">
                    {step.name.split(' ')[0]}
                  </span>
                </div>
              </div>
            ))}

            {/* Final Connector */}
            <div className={`h-0.5 w-6 ${getConnectorColor(steps.length - 1)} transition-all`} />

            {/* END Node */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full ${
                steps.every(s => s.status === 'completed')
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                  : 'bg-gray-700'
              } flex items-center justify-center text-xs font-bold transition-all`}>
                ■
              </div>
              <span className="text-[10px] text-gray-500">END</span>
            </div>
          </div>

          {/* Progress Bar */}
          {status === 'running' && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Step {currentStep + 1}/{steps.length}</span>
                <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
              </div>
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Expanded Content - Event Stream */}
        {isExpanded && (
          <div className="border-t border-gray-700 p-4 bg-gray-900/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-300">Live Events</h4>
              <span className="text-xs text-gray-500">{events.length} events</span>
            </div>
            <div className="bg-gray-950 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
              {events.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No events yet</p>
              ) : (
                events.slice(-10).reverse().map((event, idx) => (
                  <div key={idx} className="text-xs border-l-2 border-gray-700 pl-2 py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-[10px]">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      {'agent' in event && event.agent && (
                        <span className="text-purple-400">{event.agent}</span>
                      )}
                      {'status' in event && event.status && (
                        <span className={`text-[10px] ${
                          event.status === 'started' ? 'text-yellow-400' :
                          event.status === 'completed' ? 'text-green-400' :
                          event.status === 'failed' ? 'text-red-400' :
                          'text-gray-400'
                        }`}>
                          [{event.status}]
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Step Detail Modal */}
      {selectedStep && (
        <StepDetailModal
          step={selectedStep}
          events={events}
          onClose={() => setSelectedStep(null)}
        />
      )}
    </>
  );
}

// Made with Bob
