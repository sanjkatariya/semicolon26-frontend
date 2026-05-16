'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type DashboardData = {
  dashboard: {
    overview: {
      security_score: number;
      security_score_trend: string;
      total_vulnerabilities: number;
      vulnerabilities_trend: string;
      critical_vulnerabilities: number;
      high_vulnerabilities: number;
      medium_vulnerabilities: number;
      low_vulnerabilities: number;
      mean_time_to_remediate_hours: number;
      automation_rate: number;
      active_agents: number;
      total_agents: number;
    };
    recent_activity: Array<{
      id: string;
      type: string;
      title: string;
      timestamp: string;
      severity?: string;
      agent?: string;
    }>;
    vulnerability_trends: Array<{
      date: string;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }>;
  };
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/mock-data/dashboard-metrics.json')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading dashboard:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-white text-xl">Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  const { overview, recent_activity, vulnerability_trends } = data.dashboard;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <span className="text-3xl">🛡️</span>
            Security Dashboard
          </h1>
          <p className="text-sm text-slate-400">Real-time security posture</p>
        </div>

        {/* Security Score - Hero Section */}
        <div className="mb-4 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Security Score</h2>
                <p className="text-xs text-slate-300">Overall posture</p>
              </div>
              <div className="text-right">
                <div className={`text-5xl font-bold ${getScoreColor(overview.security_score)}`}>
                  {overview.security_score}
                </div>
                <div className="text-green-400 text-sm font-semibold mt-1">
                  {overview.security_score_trend}
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3 bg-slate-800/50 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-1000 ease-out"
                style={{ width: `${overview.security_score}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {/* Total Vulnerabilities */}
          <Link href="/vulnerabilities">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🔍</span>
                <span className="text-green-400 text-xs font-semibold">{overview.vulnerabilities_trend}</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{overview.total_vulnerabilities}</div>
              <div className="text-slate-400 text-xs">Total Vulnerabilities</div>
              
              {/* Severity Breakdown */}
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className="bg-red-500/10 border border-red-500/20 rounded p-1.5">
                  <div className="text-red-400 text-xs">Critical</div>
                  <div className="text-red-400 font-bold text-sm">{overview.critical_vulnerabilities}</div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded p-1.5">
                  <div className="text-orange-400 text-xs">High</div>
                  <div className="text-orange-400 font-bold text-sm">{overview.high_vulnerabilities}</div>
                </div>
              </div>
            </div>
          </Link>

          {/* MTTR */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">⚡</span>
              <span className="text-blue-400 text-xs font-semibold">Avg Time</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{overview.mean_time_to_remediate_hours}h</div>
            <div className="text-slate-400 text-xs">Mean Time to Remediate</div>
            
            <div className="mt-2 bg-blue-500/10 border border-blue-500/20 rounded p-2">
              <div className="text-blue-400 text-xs mb-1">Target: {'<'} 6h</div>
              <div className="bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>

          {/* Automation Rate */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🤖</span>
              <span className="text-purple-400 text-xs font-semibold">AI Powered</span>
            </div>
            <div className="text-2xl font-bold text-purple-400 mb-1">{overview.automation_rate}%</div>
            <div className="text-slate-400 text-xs">Automation Rate</div>
            
            <div className="mt-2 bg-purple-500/10 border border-purple-500/20 rounded p-2">
              <div className="text-purple-400 text-xs mb-1">Automated Fixes</div>
              <div className="bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${overview.automation_rate}%` }}></div>
              </div>
            </div>
          </div>

          {/* Active Agents */}
          <Link href="/agents">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4 hover:border-green-500/50 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🎯</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {overview.active_agents}/{overview.total_agents}
              </div>
              <div className="text-slate-400 text-xs">Active Agents</div>
              
              <div className="mt-2 bg-green-500/10 border border-green-500/20 rounded p-2">
                <div className="text-green-400 text-xs mb-1">System Health</div>
                <div className="bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Recent Activity - 2 columns */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📡</span>
                Recent Activity
              </h2>
              <Link href="/events" className="text-blue-400 hover:text-blue-300 text-xs font-medium">
                View All →
              </Link>
            </div>

            <div className="space-y-2">
              {recent_activity && Array.isArray(recent_activity) && recent_activity.slice(0, 8).map((activity) => (
                <div
                  key={activity.id}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {activity.type === 'vulnerability_detected' && <span className="text-sm">🔍</span>}
                        {activity.type === 'remediation_completed' && <span className="text-sm">✅</span>}
                        {activity.type === 'pr_created' && <span className="text-sm">📝</span>}
                        {activity.type === 'scan_completed' && <span className="text-sm">🎯</span>}
                        {activity.type === 'agent_registered' && <span className="text-sm">🤖</span>}
                        
                        <span className="text-white font-medium text-sm truncate">{activity.title}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{formatTimestamp(activity.timestamp)}</span>
                        {activity.agent && (
                          <>
                            <span>•</span>
                            <span className="text-blue-400 truncate">{activity.agent}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {activity.severity && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(activity.severity)} ml-2 flex-shrink-0`}>
                        {activity.severity}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vulnerability Trends - 1 column */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span>📊</span>
              Trends
            </h2>

            <div className="space-y-4">
              {vulnerability_trends && Array.isArray(vulnerability_trends) && vulnerability_trends.slice(0, 7).map((trend, idx) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-2">{trend.date}</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-red-400">Critical</span>
                      <span className="text-red-400 font-bold">{trend.critical}</span>
                    </div>
                    <div className="bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${(trend.critical / 10) * 100}%` }}></div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-orange-400">High</span>
                      <span className="text-orange-400 font-bold">{trend.high}</span>
                    </div>
                    <div className="bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${(trend.high / 20) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/workflows" className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-6 hover:border-blue-400 transition-all group">
            <div className="text-4xl mb-3">⚙️</div>
            <div className="text-white font-bold mb-1">Start Workflow</div>
            <div className="text-slate-400 text-sm">Trigger remediation</div>
          </Link>

          <Link href="/agents" className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-xl p-6 hover:border-green-400 transition-all group">
            <div className="text-4xl mb-3">🤖</div>
            <div className="text-white font-bold mb-1">Manage Agents</div>
            <div className="text-slate-400 text-sm">Configure scanners</div>
          </Link>

          <Link href="/pull-requests" className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-6 hover:border-purple-400 transition-all group">
            <div className="text-4xl mb-3">📝</div>
            <div className="text-white font-bold mb-1">Review PRs</div>
            <div className="text-slate-400 text-sm">Automated fixes</div>
          </Link>

          <Link href="/vulnerabilities" className="bg-gradient-to-br from-red-600/20 to-red-800/20 border border-red-500/30 rounded-xl p-6 hover:border-red-400 transition-all group">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-white font-bold mb-1">View Vulnerabilities</div>
            <div className="text-slate-400 text-sm">Security issues</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
