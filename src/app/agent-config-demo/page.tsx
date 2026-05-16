'use client';

import { useState } from 'react';
import DynamicAgentForm from '@/components/DynamicAgentForm';
import DynamicAgentReport from '@/components/DynamicAgentReport';

export default function AgentConfigDemoPage() {
  const [view, setView] = useState<'form' | 'report'>('form');
  const [executionId, setExecutionId] = useState<string>('exec-trivy-001');

  const handleFormSubmit = (data: Record<string, any>) => {
    console.log('Form submitted with data:', data);
    alert('Agent execution started!\n\n' + JSON.stringify(data, null, 2));
    // In real app, this would call API and get execution_id
    setExecutionId('exec-trivy-001');
    setView('report');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white mb-1">🧪 Agent Configuration Demo</h1>
          <p className="text-sm text-slate-400">Test dynamic form generation and report rendering</p>
        </div>

        {/* View Switcher */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setView('form')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              view === 'form'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📝 Input Form
          </button>
          <button
            onClick={() => setView('report')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              view === 'report'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📊 Execution Report
          </button>
        </div>

        {/* Content */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          {view === 'form' ? (
            <div>
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="text-blue-400 text-sm font-medium mb-1">ℹ️ Demo Mode</div>
                <div className="text-blue-300 text-xs">
                  This form is dynamically generated from the agent configuration schema.
                  Fill in the fields and click "Execute Agent" to see the form in action.
                </div>
              </div>
              <DynamicAgentForm
                agentId="trivy-scanner-v1"
                onSubmit={handleFormSubmit}
              />
            </div>
          ) : (
            <div>
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="text-green-400 text-sm font-medium mb-1">✅ Demo Mode</div>
                <div className="text-green-300 text-xs">
                  This report is dynamically generated from the execution results and output schema.
                  Different widgets are rendered based on the field types.
                </div>
              </div>
              <DynamicAgentReport executionId={executionId} />
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-2">📋 Supported Input Widgets</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Text Input (with validation)</li>
              <li>• Number Input (with min/max)</li>
              <li>• Select Dropdown</li>
              <li>• Multi-Select Checkboxes</li>
              <li>• Boolean Checkbox</li>
              <li>• Textarea</li>
              <li>• File Upload</li>
              <li>• JSON Editor</li>
            </ul>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-2">📊 Supported Output Widgets</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Metric Cards</li>
              <li>• Bar Charts</li>
              <li>• Pie Charts</li>
              <li>• Data Tables (sortable/filterable)</li>
              <li>• Status Badges</li>
              <li>• Text Display</li>
              <li>• Number Display</li>
              <li>• Array Lists</li>
            </ul>
          </div>
        </div>

        {/* Mock Data Info */}
        <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <h3 className="text-lg font-bold text-purple-400 mb-2">🔧 Mock Data Files</h3>
          <div className="text-sm text-purple-300 space-y-1">
            <p>• <code className="bg-purple-900/30 px-2 py-0.5 rounded">frontend/public/mock-data/agent-config-trivy.json</code> - Agent configuration schema</p>
            <p>• <code className="bg-purple-900/30 px-2 py-0.5 rounded">frontend/public/mock-data/agent-execution-result-trivy.json</code> - Sample execution results</p>
            <p className="mt-2 text-xs text-purple-400">
              Note: In production, these would be fetched from the backend API endpoints.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
