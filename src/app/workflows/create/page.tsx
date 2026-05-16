'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Agent {
  id: string;
  name: string;
  type: 'scanner' | 'analyzer' | 'fixer' | 'notifier';
  icon: string;
  description: string;
  capabilities: string[];
}

interface WorkflowNode {
  id: string;
  agentId: string;
  agentName: string;
  agentType: string;
  icon: string;
  position: number;
}

export default function CreateWorkflowPage() {
  const router = useRouter();
  
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [selectedNodes, setSelectedNodes] = useState<WorkflowNode[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Available agents library
  const availableAgents: Agent[] = [
    // Scanners
    {
      id: 'trivy',
      name: 'Trivy Scanner',
      type: 'scanner',
      icon: '🔍',
      description: 'Container & filesystem vulnerability scanner',
      capabilities: ['container_scan', 'filesystem_scan', 'git_scan']
    },
    {
      id: 'snyk',
      name: 'Snyk Scanner',
      type: 'scanner',
      icon: '🛡️',
      description: 'Dependency vulnerability scanner',
      capabilities: ['dependency_scan', 'license_check']
    },
    {
      id: 'semgrep',
      name: 'Semgrep',
      type: 'scanner',
      icon: '🔎',
      description: 'Static code analysis',
      capabilities: ['code_analysis', 'pattern_matching']
    },
    {
      id: 'checkov',
      name: 'Checkov',
      type: 'scanner',
      icon: '☁️',
      description: 'Infrastructure as Code scanner',
      capabilities: ['terraform_scan', 'kubernetes_scan', 'cloudformation_scan']
    },
    {
      id: 'sonarqube',
      name: 'SonarQube',
      type: 'scanner',
      icon: '📊',
      description: 'Code quality & security scanner',
      capabilities: ['code_quality', 'security_hotspots', 'code_smells']
    },
    
    // Analyzers
    {
      id: 'normalizer',
      name: 'Vulnerability Normalizer',
      type: 'analyzer',
      icon: '⚙️',
      description: 'Normalize vulnerability data',
      capabilities: ['data_normalization', 'deduplication']
    },
    {
      id: 'prioritizer',
      name: 'Risk Prioritizer',
      type: 'analyzer',
      icon: '🎯',
      description: 'Prioritize vulnerabilities by risk',
      capabilities: ['risk_scoring', 'prioritization']
    },
    {
      id: 'kubernetes-analyzer',
      name: 'Kubernetes Analyzer',
      type: 'analyzer',
      icon: '☸️',
      description: 'Analyze Kubernetes cluster security',
      capabilities: ['cluster_analysis', 'rbac_check', 'network_policy']
    },
    
    // Fixers
    {
      id: 'ai-patcher',
      name: 'AI Code Patcher',
      type: 'fixer',
      icon: '🤖',
      description: 'AI-powered code fix generation',
      capabilities: ['code_fix', 'ai_generation']
    },
    {
      id: 'dependency-fixer',
      name: 'Dependency Fixer',
      type: 'fixer',
      icon: '📦',
      description: 'Automated dependency updates',
      capabilities: ['dependency_update', 'version_bump']
    },
    {
      id: 'infrastructure-fixer',
      name: 'Infrastructure Fixer',
      type: 'fixer',
      icon: '🏗️',
      description: 'Fix infrastructure misconfigurations',
      capabilities: ['iac_fix', 'config_update']
    },
    
    // Notifiers
    {
      id: 'slack-notifier',
      name: 'Slack Notifier',
      type: 'notifier',
      icon: '💬',
      description: 'Send notifications to Slack',
      capabilities: ['slack_notification']
    },
    {
      id: 'email-notifier',
      name: 'Email Notifier',
      type: 'notifier',
      icon: '📧',
      description: 'Send email notifications',
      capabilities: ['email_notification']
    }
  ];

  const addAgentToWorkflow = (agent: Agent) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.type,
      icon: agent.icon,
      position: selectedNodes.length
    };
    setSelectedNodes([...selectedNodes, newNode]);
  };

  const removeNode = (nodeId: string) => {
    setSelectedNodes(selectedNodes.filter(n => n.id !== nodeId));
  };

  const moveNodeUp = (index: number) => {
    if (index === 0) return;
    const newNodes = [...selectedNodes];
    [newNodes[index - 1], newNodes[index]] = [newNodes[index], newNodes[index - 1]];
    setSelectedNodes(newNodes);
  };

  const moveNodeDown = (index: number) => {
    if (index === selectedNodes.length - 1) return;
    const newNodes = [...selectedNodes];
    [newNodes[index], newNodes[index + 1]] = [newNodes[index + 1], newNodes[index]];
    setSelectedNodes(newNodes);
  };

  const saveWorkflow = () => {
    if (!workflowName || selectedNodes.length === 0) {
      alert('Please provide workflow name and add at least one agent');
      return;
    }
    setShowSaveModal(true);
  };

  const executeWorkflow = () => {
    // Save workflow and navigate to execute page
    router.push('/workflows/execute');
  };

  const getAgentTypeColor = (type: string) => {
    switch (type) {
      case 'scanner': return 'bg-blue-500/20 border-blue-500 text-blue-400';
      case 'analyzer': return 'bg-purple-500/20 border-purple-500 text-purple-400';
      case 'fixer': return 'bg-green-500/20 border-green-500 text-green-400';
      case 'notifier': return 'bg-orange-500/20 border-orange-500 text-orange-400';
      default: return 'bg-slate-500/20 border-slate-500 text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/workflows')}
            className="mb-4 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg transition-all flex items-center gap-2"
          >
            ← Back to Workflows
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">🎨 Create Custom Workflow</h1>
          <p className="text-slate-400">Build your own security automation workflow by selecting agents</p>
        </div>

        {/* Workflow Info */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Workflow Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Workflow Name *
              </label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Full Security Scan & Fix"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Description
              </label>
              <input
                type="text"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="Brief description of workflow"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Agent Library */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-white mb-4">📚 Agent Library</h2>
              
              {/* Scanners */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-blue-400 mb-3">🔍 SCANNERS</h3>
                <div className="space-y-2">
                  {availableAgents.filter(a => a.type === 'scanner').map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => addAgentToWorkflow(agent)}
                      className="w-full text-left p-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{agent.icon}</span>
                        <span className="text-white font-medium text-sm">{agent.name}</span>
                      </div>
                      <p className="text-slate-400 text-xs">{agent.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Analyzers */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-purple-400 mb-3">⚙️ ANALYZERS</h3>
                <div className="space-y-2">
                  {availableAgents.filter(a => a.type === 'analyzer').map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => addAgentToWorkflow(agent)}
                      className="w-full text-left p-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500 rounded-lg transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{agent.icon}</span>
                        <span className="text-white font-medium text-sm">{agent.name}</span>
                      </div>
                      <p className="text-slate-400 text-xs">{agent.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fixers */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-green-400 mb-3">🔧 FIXERS</h3>
                <div className="space-y-2">
                  {availableAgents.filter(a => a.type === 'fixer').map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => addAgentToWorkflow(agent)}
                      className="w-full text-left p-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-700 hover:border-green-500 rounded-lg transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{agent.icon}</span>
                        <span className="text-white font-medium text-sm">{agent.name}</span>
                      </div>
                      <p className="text-slate-400 text-xs">{agent.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifiers */}
              <div>
                <h3 className="text-sm font-bold text-orange-400 mb-3">📢 NOTIFIERS</h3>
                <div className="space-y-2">
                  {availableAgents.filter(a => a.type === 'notifier').map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => addAgentToWorkflow(agent)}
                      className="w-full text-left p-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-700 hover:border-orange-500 rounded-lg transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{agent.icon}</span>
                        <span className="text-white font-medium text-sm">{agent.name}</span>
                      </div>
                      <p className="text-slate-400 text-xs">{agent.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">🎯 Workflow Canvas</h2>
              
              {selectedNodes.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">👈</div>
                  <h3 className="text-xl font-bold text-slate-400 mb-2">
                    Start Building Your Workflow
                  </h3>
                  <p className="text-slate-500">
                    Click on agents from the library to add them to your workflow
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Start Node */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-32 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 px-4 rounded-lg text-center">
                      🚀 START
                    </div>
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-green-500 to-transparent"></div>
                  </div>

                  {/* Agent Nodes */}
                  {selectedNodes.map((node, index) => (
                    <div key={node.id}>
                      <div className="flex items-center gap-4">
                        <div className={`flex-1 border-2 rounded-xl p-4 ${getAgentTypeColor(node.agentType)}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{node.icon}</span>
                              <div>
                                <h3 className="font-bold">{node.agentName}</h3>
                                <span className="text-xs opacity-75">{node.agentType.toUpperCase()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => moveNodeUp(index)}
                                disabled={index === 0}
                                className="p-2 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveNodeDown(index)}
                                disabled={index === selectedNodes.length - 1}
                                className="p-2 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => removeNode(node.id)}
                                className="p-2 hover:bg-red-500/20 rounded text-red-400"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < selectedNodes.length - 1 && (
                        <div className="ml-16 h-8 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500"></div>
                      )}
                    </div>
                  ))}

                  {/* End Node */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent to-red-500"></div>
                    <div className="flex-shrink-0 w-32 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-3 px-4 rounded-lg text-center">
                      🏁 END
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedNodes.length > 0 && (
                <div className="mt-8 flex gap-4">
                  <button
                    onClick={saveWorkflow}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-500/50"
                  >
                    💾 Save Workflow
                  </button>
                  <button
                    onClick={executeWorkflow}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-lg transition-all shadow-lg shadow-green-500/50"
                  >
                    🚀 Save & Execute
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Success Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-green-500/50 rounded-2xl shadow-2xl shadow-green-500/20 max-w-md w-full">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-t-2xl">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <span className="text-5xl">✅</span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white text-center">
                  Workflow Saved!
                </h2>
              </div>
              <div className="p-6">
                <p className="text-slate-300 text-center mb-6">
                  Your custom workflow <strong className="text-white">{workflowName}</strong> has been saved successfully with {selectedNodes.length} agents.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => router.push('/workflows')}
                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all"
                  >
                    View Workflows
                  </button>
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-lg transition-all"
                  >
                    Create Another
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob
