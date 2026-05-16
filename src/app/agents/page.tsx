'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Agent = {
  id: string;
  name: string;
  type: 'scanner' | 'remediation';
  category: string;
  status: 'active' | 'inactive' | 'maintenance';
  health: 'healthy' | 'degraded' | 'unhealthy';
  capabilities: string[];
  supported_languages?: string[];
  version: string;
  last_heartbeat: string;
  metadata?: {
    scans_completed?: number;
    vulnerabilities_found?: number;
    remediations_completed?: number;
    success_rate?: number;
    average_scan_time?: string;
  };
};

export default function AgentsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'scanner' | 'remediation'>('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'healthy' | 'degraded' | 'unhealthy'>('all');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/mock-data/agents.json')
      .then(res => res.json())
      .then(data => {
        setAgents(data.agents);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading agents:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 flex items-center justify-center">
        <div className="text-white text-xl">Loading agents...</div>
      </div>
    );
  }

  const filteredAgents = agents.filter(agent => {
    const typeMatch = filter === 'all' || agent.type === filter;
    const healthMatch = healthFilter === 'all' || agent.health === healthFilter;
    return typeMatch && healthMatch;
  });

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'degraded': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'unhealthy': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'inactive': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
      case 'maintenance': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'scanner' 
      ? 'text-blue-500 bg-blue-500/10 border-blue-500/20'
      : 'text-purple-500 bg-purple-500/10 border-purple-500/20';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const scannerAgents = agents.filter(a => a.type === 'scanner');
  const remediationAgents = agents.filter(a => a.type === 'remediation');
  const healthyAgents = agents.filter(a => a.health === 'healthy');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🤖 Agent Registry</h1>
            <p className="text-slate-400">Monitor and manage security agents</p>
          </div>
          <button
            onClick={() => router.push('/agents/register')}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-lg shadow-lg shadow-green-500/50 transition-all flex items-center gap-2"
          >
            ➕ Register New Agent
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Agents</span>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
            <div className="text-3xl font-bold text-white">{agents.length}</div>
            <div className="text-xs text-slate-500 mt-1">All registered agents</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Scanner Agents</span>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
            <div className="text-3xl font-bold text-white">{scannerAgents.length}</div>
            <div className="text-xs text-slate-500 mt-1">Vulnerability detection</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Remediation Agents</span>
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            </div>
            <div className="text-3xl font-bold text-white">{remediationAgents.length}</div>
            <div className="text-xs text-slate-500 mt-1">Automated fixing</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Healthy Agents</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="text-3xl font-bold text-green-500">{healthyAgents.length}</div>
            <div className="text-xs text-slate-500 mt-1">
              {Math.round((healthyAgents.length / agents.length) * 100)}% uptime
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Agent Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  All ({agents.length})
                </button>
                <button
                  onClick={() => setFilter('scanner')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === 'scanner'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Scanners ({scannerAgents.length})
                </button>
                <button
                  onClick={() => setFilter('remediation')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === 'remediation'
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Remediation ({remediationAgents.length})
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Health Status</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setHealthFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    healthFilter === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setHealthFilter('healthy')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    healthFilter === 'healthy'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Healthy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-blue-500/10"
            >
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getTypeColor(agent.type)}`}>
                      {agent.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 capitalize">{agent.category?.replace(/_/g, ' ') || 'N/A'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getHealthColor(agent.health)}`}>
                    ● {agent.health}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>
              </div>

              {/* Agent Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Version</span>
                  <span className="text-white font-mono">{agent.version}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Last Heartbeat</span>
                  <span className="text-green-400">{formatTimestamp(agent.last_heartbeat)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Agent ID</span>
                  <span className="text-slate-500 font-mono text-xs">{agent.id}</span>
                </div>
              </div>

              {/* Capabilities */}
              {agent.capabilities && agent.capabilities.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((capability, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-300"
                      >
                        {capability?.replace(/_/g, ' ') || capability}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Supported Languages */}
              {agent.supported_languages && agent.supported_languages.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Supported Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {agent.supported_languages.map((lang, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata Stats */}
              {agent.metadata && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-700">
                  {agent.metadata.scans_completed !== undefined && (
                    <div>
                      <div className="text-xs text-slate-400">Scans Completed</div>
                      <div className="text-lg font-bold text-white">{agent.metadata.scans_completed}</div>
                    </div>
                  )}
                  {agent.metadata.vulnerabilities_found !== undefined && (
                    <div>
                      <div className="text-xs text-slate-400">Vulnerabilities Found</div>
                      <div className="text-lg font-bold text-orange-400">{agent.metadata.vulnerabilities_found}</div>
                    </div>
                  )}
                  {agent.metadata.remediations_completed !== undefined && (
                    <div>
                      <div className="text-xs text-slate-400">Remediations</div>
                      <div className="text-lg font-bold text-green-400">{agent.metadata.remediations_completed}</div>
                    </div>
                  )}
                  {agent.metadata.success_rate !== undefined && (
                    <div>
                      <div className="text-xs text-slate-400">Success Rate</div>
                      <div className="text-lg font-bold text-green-400">{agent.metadata.success_rate}%</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAgents.length === 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-12 text-center">
            <div className="text-slate-400 mb-2">No agents found</div>
            <div className="text-sm text-slate-500">Try adjusting your filters</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob
