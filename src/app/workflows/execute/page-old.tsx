'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkflowAPIClient } from '@/lib/workflow-api';
import { WorkflowEvent } from '@/types/workflow-execution';

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

export default function ExecuteWorkflowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [useMockExecution, setUseMockExecution] = useState(true); // Toggle for mock vs real API
  
  const [steps, setSteps] = useState<ExecutionStep[]>([
    {
      id: 1,
      name: 'Repository Scan',
      agent: 'scanner_agent',
      status: 'pending',
      duration: 0,
      progress: 0,
      input: {},
      output: {}
    },
    {
      id: 2,
      name: 'Vulnerability Analysis',
      agent: 'analysis_agent',
      status: 'pending',
      duration: 0,
      progress: 0,
      input: {},
      output: {}
    },
    {
      id: 3,
      name: 'Remediation',
      agent: 'remediation_agent',
      status: 'pending',
      duration: 0,
      progress: 0,
      input: {},
      output: {}
    },
    {
      id: 4,
      name: 'Validation',
      agent: 'validation_agent',
      status: 'pending',
      duration: 0,
      progress: 0,
      input: {},
      output: {}
    },
    {
      id: 5,
      name: 'Pull Request',
      agent: 'pr_agent',
      status: 'pending',
      duration: 0,
      progress: 0,
      input: {},
      output: {}
    }
  ]);

  const [formData, setFormData] = useState({
    repo_url: searchParams.get('repo_url') || 'https://github.com/kim815/vulnerable-repo',
    branch: searchParams.get('branch') || 'main',
    triggered_by: 'ui'
  });

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionStats, setCompletionStats] = useState({
    totalSteps: 0,
    completedSteps: 0,
    vulnerabilitiesFixed: 0,
    prsCreated: 0,
    duration: ''
  });

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if ((window as any).currentEventSource) {
        (window as any).currentEventSource.close();
      }
    };
  }, []);

  // Mock execution function
  const executeMockWorkflow = async () => {
    setIsExecuting(true);
    setEvents([]);
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending', progress: 0, duration: 0, input: {}, output: {} })));
    setShowCompletionModal(false);

    const startTime = Date.now();

    // Add workflow started event
    const startEvent: WorkflowEvent = {
      event: 'workflow_started',
      timestamp: new Date().toISOString(),
      message: 'Workflow execution started'
    };
    setEvents(prev => [...prev, startEvent]);

    // Execute each step with delay
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStep(i);

      // Step started
      const startedEvent: WorkflowEvent = {
        event: 'agent_status',
        agent: step.agent,
        status: 'started',
        timestamp: new Date().toISOString(),
        message: `${step.name} started`
      };
      setEvents(prev => [...prev, startedEvent]);

      setSteps(prev => prev.map((s, idx) => {
        if (idx === i) {
          return {
            ...s,
            status: 'running',
            startTime: new Date().toISOString(),
            progress: 50,
            input: {
              repository_url: formData.repo_url,
              branch: formData.branch
            }
          };
        }
        return s;
      }));

      // Simulate execution time (2-4 seconds per step)
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

      // Step completed
      const mockOutput = generateMockOutput(step.agent, formData.repo_url);
      const completedEvent: WorkflowEvent = {
        event: 'agent_status',
        agent: step.agent,
        status: 'completed',
        timestamp: new Date().toISOString(),
        data: mockOutput,
        message: `${step.name} completed successfully`
      };
      setEvents(prev => [...prev, completedEvent]);

      setSteps(prev => prev.map((s, idx) => {
        if (idx === i) {
          const endTime = new Date().toISOString();
          const duration = Math.round((new Date(endTime).getTime() - new Date(s.startTime!).getTime()) / 1000);
          return {
            ...s,
            status: 'completed',
            endTime,
            progress: 100,
            duration,
            output: mockOutput
          };
        }
        return s;
      }));
    }

    // Workflow completed
    const endTime = Date.now();
    const totalDuration = Math.round((endTime - startTime) / 1000);
    
    const completedEvent: WorkflowEvent = {
      event: 'workflow_completed',
      timestamp: new Date().toISOString(),
      message: 'Workflow execution completed successfully',
      data: {
        total_steps: steps.length,
        completed_steps: steps.length,
        vulnerabilities_fixed: 12,
        prs_created: 3,
        duration: `${totalDuration}s`
      }
    };
    setEvents(prev => [...prev, completedEvent]);

    setCompletionStats({
      totalSteps: steps.length,
      completedSteps: steps.length,
      vulnerabilitiesFixed: 12,
      prsCreated: 3,
      duration: `${totalDuration}s`
    });

    setShowCompletionModal(true);
    setIsExecuting(false);
  };

  // Generate mock output based on agent type
  const generateMockOutput = (agent: string, repoUrl: string) => {
    switch (agent) {
      case 'scanner_agent':
        return {
          vulnerabilities_found: 12,
          critical: 2,
          high: 5,
          medium: 3,
          low: 2,
          scan_duration: '45s',
          repository: repoUrl
        };
      case 'analysis_agent':
        return {
          analyzed_vulnerabilities: 12,
          remediable: 10,
          manual_review_required: 2,
          priority_score: 8.5,
          affected_files: ['package.json', 'requirements.txt', 'Dockerfile']
        };
      case 'remediation_agent':
        return {
          fixes_applied: 10,
          dependencies_updated: 8,
          config_changes: 2,
          files_modified: 3,
          success_rate: '100%'
        };
      case 'validation_agent':
        return {
          validation_passed: true,
          tests_run: 45,
          tests_passed: 45,
          security_score_improvement: '+15%',
          remaining_vulnerabilities: 2
        };
      case 'pr_agent':
        return {
          prs_created: 3,
          pr_urls: [
            'https://github.com/kim815/vulnerable-repo/pull/123',
            'https://github.com/kim815/vulnerable-repo/pull/124',
            'https://github.com/kim815/vulnerable-repo/pull/125'
          ],
          auto_merge_eligible: 2,
          review_required: 1
        };
      default:
        return {};
    }
  };

  // Real API execution function
  const executeRealWorkflow = async () => {
    setIsExecuting(true);
    setEvents([]);
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending', progress: 0, duration: 0, input: {}, output: {} })));
    setShowCompletionModal(false);

    const startTime = Date.now();

    try {
      // Trigger workflow via API
      const eventSource = WorkflowAPIClient.triggerWorkflow(
        {
          repo_url: formData.repo_url,
          branch: formData.branch,
          triggered_by: formData.triggered_by
        },
        (event: WorkflowEvent) => {
          // Handle incoming events
          console.log('Received event:', event);
          
          // Add event to stream
          setEvents(prev => [...prev, event]);

          // Update steps based on event
          if (event.event === 'agent_status' && event.agent) {
            const agentIndex = steps.findIndex(s => s.agent === event.agent);
            if (agentIndex !== -1) {
              setSteps(prev => prev.map((s, idx) => {
                if (idx === agentIndex) {
                  if (event.status === 'started') {
                    setCurrentStep(idx);
                    return {
                      ...s,
                      status: 'running',
                      startTime: event.timestamp,
                      progress: 50,
                      input: {
                        repository_url: formData.repo_url,
                        branch: formData.branch
                      }
                    };
                  } else if (event.status === 'completed') {
                    const endTime = event.timestamp;
                    const duration = s.startTime
                      ? Math.round((new Date(endTime).getTime() - new Date(s.startTime).getTime()) / 1000)
                      : 0;
                    return {
                      ...s,
                      status: 'completed',
                      endTime,
                      progress: 100,
                      duration,
                      output: event.data || {}
                    };
                  } else if (event.status === 'failed') {
                    return {
                      ...s,
                      status: 'failed',
                      endTime: event.timestamp,
                      progress: 100,
                      output: { error: event.data?.error || 'Unknown error' }
                    };
                  }
                }
                return s;
              }));
            }
          } else if (event.event === 'workflow_completed') {
            // Workflow completed
            const endTime = Date.now();
            const totalDuration = Math.round((endTime - startTime) / 1000);
            
            setCompletionStats({
              totalSteps: steps.length,
              completedSteps: steps.filter(s => s.status === 'completed').length,
              vulnerabilitiesFixed: event.data?.vulnerabilities_fixed || 0,
              prsCreated: event.data?.prs_created || 0,
              duration: `${totalDuration}s`
            });

            setShowCompletionModal(true);
            setIsExecuting(false);
          }
        },
        (error: Error) => {
          // Handle errors
          console.error('Workflow execution error:', error);
          setEvents(prev => [...prev, {
            event: 'error',
            timestamp: new Date().toISOString(),
            message: error.message
          }]);
          setIsExecuting(false);
          alert(`Error: ${error.message}`);
        },
        () => {
          // Handle completion
          console.log('Workflow stream completed');
          setIsExecuting(false);
        }
      );

      // Store event source for cleanup
      (window as any).currentEventSource = eventSource;
    } catch (error) {
      console.error('Failed to start workflow:', error);
      setIsExecuting(false);
      alert('Failed to connect to backend. Please ensure the backend is running on http://localhost:8000');
    }
  };

  const startExecution = async () => {
    if (isExecuting) return;

    if (useMockExecution) {
      // Use mock execution
      await executeMockWorkflow();
    } else {
      // Use real API
      await executeRealWorkflow();
    }
  };

  const getStepStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'bg-green-500', icon: '✓', text: 'Completed' };
      case 'running':
        return { color: 'bg-blue-500 animate-pulse', icon: '⟳', text: 'Running' };
      case 'failed':
        return { color: 'bg-red-500', icon: '✗', text: 'Failed' };
      default:
        return { color: 'bg-gray-600', icon: '○', text: 'Pending' };
    }
  };

  const getPipelineStepColor = (index: number) => {
    const step = steps[index];
    if (step.status === 'completed') return 'bg-green-500 border-green-400';
    if (step.status === 'running') return 'bg-blue-500 border-blue-400 animate-pulse';
    if (step.status === 'failed') return 'bg-red-500 border-red-400';
    return 'bg-gray-700 border-gray-600';
  };

  const getConnectorColor = (index: number) => {
    if (index < 0 || index >= steps.length - 1) return 'bg-gray-700';
    const currentStep = steps[index];
    const nextStep = steps[index + 1];
    
    if (!currentStep || !nextStep) return 'bg-gray-700';
    
    if (currentStep.status === 'completed' && (nextStep.status === 'running' || nextStep.status === 'completed')) {
      return 'bg-green-500';
    }
    if (currentStep.status === 'running') {
      return 'bg-blue-500';
    }
    return 'bg-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push('/workflows')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <span>←</span> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              🚀
            </div>
            <div>
              <h1 className="text-2xl font-bold">Execute Workflow</h1>
              <p className="text-sm text-gray-400">Automated vulnerability remediation with real-time streaming</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Input Form */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-2xl">📝</span>
                <h2 className="text-xl font-semibold">Input</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Repository URL
                  </label>
                  <input
                    type="text"
                    value={formData.repo_url}
                    onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })}
                    disabled={isExecuting}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
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
                    disabled={isExecuting}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
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
                    disabled={isExecuting}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                    placeholder="ui"
                  />
                </div>

                {/* Mock/Real API Toggle */}
                <div className="pt-4 border-t border-gray-700">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useMockExecution}
                      onChange={(e) => setUseMockExecution(e.target.checked)}
                      disabled={isExecuting}
                      className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-300">
                      Use Mock Execution (Demo Mode)
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-2 ml-7">
                    {useMockExecution 
                      ? 'Simulates workflow execution with mock data' 
                      : 'Connects to real backend API'}
                  </p>
                </div>

                <button
                  onClick={startExecution}
                  disabled={isExecuting}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isExecuting
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                  }`}
                >
                  {isExecuting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⚙️</span> Executing...
                    </span>
                  ) : (
                    'Start Workflow'
                  )}
                </button>

                {isExecuting && (
                  <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                      <span className="animate-pulse">●</span>
                      <span>Step {currentStep + 1}/{steps.length}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {steps[currentStep]?.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Execution Pipeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Horizontal Pipeline Visualization */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-2xl">🔄</span>
                <h2 className="text-xl font-semibold">Execution Pipeline</h2>
              </div>

              <div className="flex items-center justify-between gap-4 mb-8">
                {/* START Node */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center font-bold shadow-lg">
                    ▶
                  </div>
                  <span className="text-xs text-gray-400">START</span>
                </div>

                {/* Pipeline Steps */}
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-4">
                    {/* Connector Line */}
                    <div className={`h-1 w-12 ${getConnectorColor(index - 1)} transition-all duration-500`} />
                    
                    {/* Step Node */}
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`w-16 h-16 rounded-full border-2 ${getPipelineStepColor(index)} flex flex-col items-center justify-center font-bold shadow-lg transition-all duration-300 cursor-pointer hover:scale-110`}
                        onClick={() => setSelectedStep(step.id)}
                      >
                        <span className="text-xl">{index + 1}</span>
                        {step.status === 'running' && (
                          <span className="text-xs">⟳</span>
                        )}
                        {step.status === 'completed' && (
                          <span className="text-xs">✓</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 text-center max-w-[80px]">
                        {step.name.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Final Connector */}
                <div className={`h-1 w-12 ${getConnectorColor(steps.length - 1)} transition-all duration-500`} />

                {/* END Node */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full ${
                    steps.every(s => s.status === 'completed')
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                      : 'bg-gray-700'
                  } flex items-center justify-center font-bold shadow-lg transition-all duration-300`}>
                    ■
                  </div>
                  <span className="text-xs text-gray-400">END</span>
                </div>
              </div>
            </div>

            {/* Real-Time Event Stream */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📡</span>
                  <h2 className="text-xl font-semibold">Live Event Stream</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${events.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></span>
                  <span className="text-xs text-gray-400">{events.length} events</span>
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-2">
                {events.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No events yet. Start workflow to see real-time updates.
                  </div>
                ) : (
                  events.map((event, idx) => (
                    <div key={idx} className="border-l-2 border-gray-700 pl-3 py-1 hover:border-purple-500 transition-colors">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 min-w-[80px]">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              event.event === 'workflow_started' ? 'bg-blue-500/20 text-blue-400' :
                              event.event === 'workflow_completed' ? 'bg-green-500/20 text-green-400' :
                              event.event === 'workflow_failed' ? 'bg-red-500/20 text-red-400' :
                              event.event === 'agent_status' && event.status === 'started' ? 'bg-yellow-500/20 text-yellow-400' :
                              event.event === 'agent_status' && event.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              event.event === 'agent_status' && event.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {event.event}
                            </span>
                            {event.agent && (
                              <span className="text-purple-400">
                                {event.agent}
                              </span>
                            )}
                            {event.status && (
                              <span className={`text-xs ${
                                event.status === 'started' ? 'text-yellow-400' :
                                event.status === 'completed' ? 'text-green-400' :
                                event.status === 'failed' ? 'text-red-400' :
                                'text-gray-400'
                              }`}>
                                [{event.status}]
                              </span>
                            )}
                          </div>
                          {event.message && (
                            <div className="text-gray-400 mt-1">{event.message}</div>
                          )}
                          {event.data && Object.keys(event.data).length > 0 && (
                            <details className="mt-1">
                              <summary className="text-gray-500 cursor-pointer hover:text-gray-400">
                                View data ({Object.keys(event.data).length} fields)
                              </summary>
                              <pre className="text-gray-400 mt-1 p-2 bg-gray-800 rounded overflow-x-auto">
                                {JSON.stringify(event.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Steps List */}
            <div className="space-y-3">
              {steps.map((step, index) => {
                const statusInfo = getStepStatus(step.status);
                const isSelected = selectedStep === step.id;

                return (
                  <div
                    key={step.id}
                    className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border ${
                      isSelected ? 'border-purple-500' : 'border-gray-700'
                    } p-4 transition-all cursor-pointer hover:border-gray-600`}
                    onClick={() => setSelectedStep(isSelected ? null : step.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full ${statusInfo.color} flex items-center justify-center font-bold`}>
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold">{step.name}</h3>
                          <p className="text-sm text-gray-400">
                            <span className="text-purple-400">🤖</span> {step.agent}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {step.duration > 0 && (
                          <span className="text-sm text-gray-400">
                            ⏱️ {step.duration}s
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          step.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          step.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                          step.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {statusInfo.text}
                        </span>
                      </div>
                    </div>

                    {/* Step Details (Expanded) */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                        {/* Input */}
                        {Object.keys(step.input).length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">📥 Input</h4>
                            <pre className="bg-gray-900 p-3 rounded-lg text-xs overflow-x-auto">
                              {JSON.stringify(step.input, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Output */}
                        {Object.keys(step.output).length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">📤 Output</h4>
                            <pre className="bg-gray-900 p-3 rounded-lg text-xs overflow-x-auto">
                              {JSON.stringify(step.output, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Event Stream */}
            {events.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">📡</span>
                  <h2 className="text-xl font-semibold">Event Stream</h2>
                  <span className="ml-auto text-sm text-gray-400">{events.length} events</span>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {events.map((event, index) => (
                    <div
                      key={index}
                      className="bg-gray-900 p-3 rounded-lg text-sm border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold ${
                          event.event === 'workflow_completed' ? 'text-green-400' :
                          event.event === 'workflow_started' ? 'text-blue-400' :
                          event.status === 'completed' ? 'text-green-400' :
                          event.status === 'started' ? 'text-blue-400' :
                          'text-gray-400'
                        }`}>
                          {event.event}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {event.message && (
                        <p className="text-gray-400 text-xs">{event.message}</p>
                      )}
                      {event.agent && (
                        <p className="text-gray-500 text-xs mt-1">Agent: {event.agent}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Workflow Completed!</h2>
              <p className="text-gray-400 mb-6">All steps executed successfully</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-green-400">{completionStats.completedSteps}</div>
                  <div className="text-sm text-gray-400">Steps Completed</div>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400">{completionStats.vulnerabilitiesFixed}</div>
                  <div className="text-sm text-gray-400">Vulnerabilities Fixed</div>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-purple-400">{completionStats.prsCreated}</div>
                  <div className="text-sm text-gray-400">PRs Created</div>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-400">{completionStats.duration}</div>
                  <div className="text-sm text-gray-400">Duration</div>
                </div>
              </div>

              <button
                onClick={() => setShowCompletionModal(false)}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob
