'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AgentFormData {
  name: string;
  type: 'scanner' | 'analyzer' | 'fixer' | 'notifier' | '';
  category: string;
  description: string;
  version: string;
  endpoint: string;
  healthCheckEndpoint: string;
  capabilities: string[];
  configuration: {
    timeout: number;
    retries: number;
    rateLimit: number;
  };
  authentication: {
    type: 'none' | 'api_key' | 'oauth2' | 'basic';
    credentials: string;
  };
  tags: string[];
}

export default function RegisterAgentPage() {
  const router = useRouter();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredAgent, setRegisteredAgent] = useState<string>('');
  const [currentCapability, setCurrentCapability] = useState('');
  const [currentTag, setCurrentTag] = useState('');

  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    type: '',
    category: '',
    description: '',
    version: '1.0.0',
    endpoint: '',
    healthCheckEndpoint: '',
    capabilities: [],
    configuration: {
      timeout: 30,
      retries: 3,
      rateLimit: 100,
    },
    authentication: {
      type: 'none',
      credentials: '',
    },
    tags: [],
  });

  const agentTypes = [
    { value: 'scanner', label: '🔍 Scanner', description: 'Scans for vulnerabilities' },
    { value: 'analyzer', label: '🔬 Analyzer', description: 'Analyzes code/infrastructure' },
    { value: 'fixer', label: '🛠️ Fixer', description: 'Remediates issues' },
    { value: 'notifier', label: '📢 Notifier', description: 'Sends notifications' },
  ];

  const authTypes = [
    { value: 'none', label: 'None' },
    { value: 'api_key', label: 'API Key' },
    { value: 'oauth2', label: 'OAuth 2.0' },
    { value: 'basic', label: 'Basic Auth' },
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfigChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      configuration: { ...prev.configuration, [field]: value }
    }));
  };

  const handleAuthChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      authentication: { ...prev.authentication, [field]: value }
    }));
  };

  const addCapability = () => {
    if (currentCapability.trim() && !formData.capabilities.includes(currentCapability.trim())) {
      setFormData(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, currentCapability.trim()]
      }));
      setCurrentCapability('');
    }
  };

  const removeCapability = (capability: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.filter(c => c !== capability)
    }));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate API call
    console.log('Registering agent:', formData);
    
    setRegisteredAgent(formData.name);
    setShowSuccessModal(true);
  };

  const handleTestConnection = () => {
    alert(`Testing connection to ${formData.endpoint}...\n\n✅ Connection successful!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/agents')}
            className="mb-4 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Back to Agents
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">🤖 Register New Agent</h1>
          <p className="text-slate-400">Add a new security agent to the orchestration platform</p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">📋 Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Custom Trivy Scanner"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Version *
                </label>
                <input
                  type="text"
                  required
                  value={formData.version}
                  onChange={(e) => handleInputChange('version', e.target.value)}
                  placeholder="e.g., 1.0.0"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Agent Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select type...</option>
                  {agentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  placeholder="e.g., Container Security"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what this agent does..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Connection Details */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">🔌 Connection Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Agent Endpoint URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.endpoint}
                  onChange={(e) => handleInputChange('endpoint', e.target.value)}
                  placeholder="https://agent.example.com/api/v1"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Health Check Endpoint *
                </label>
                <input
                  type="url"
                  required
                  value={formData.healthCheckEndpoint}
                  onChange={(e) => handleInputChange('healthCheckEndpoint', e.target.value)}
                  placeholder="https://agent.example.com/health"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                🔍 Test Connection
              </button>
            </div>
          </div>

          {/* Capabilities */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">⚡ Capabilities</h2>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentCapability}
                  onChange={(e) => setCurrentCapability(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
                  placeholder="e.g., scan_containers, detect_cve"
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addCapability}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  + Add
                </button>
              </div>

              {formData.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.capabilities.map((capability, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-500/20 border border-blue-500 text-blue-300 rounded-full text-sm flex items-center gap-2"
                    >
                      {capability}
                      <button
                        type="button"
                        onClick={() => removeCapability(capability)}
                        className="hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">⚙️ Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.configuration.timeout}
                  onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Max Retries
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.configuration.retries}
                  onChange={(e) => handleConfigChange('retries', parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rate Limit (req/min)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.configuration.rateLimit}
                  onChange={(e) => handleConfigChange('rateLimit', parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Authentication */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">🔐 Authentication</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Authentication Type
                </label>
                <select
                  value={formData.authentication.type}
                  onChange={(e) => handleAuthChange('type', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {authTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {formData.authentication.type !== 'none' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Credentials
                  </label>
                  <input
                    type="password"
                    value={formData.authentication.credentials}
                    onChange={(e) => handleAuthChange('credentials', e.target.value)}
                    placeholder="Enter API key, token, or credentials"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Credentials will be encrypted and stored securely in Vault
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">🏷️ Tags</h2>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="e.g., production, critical, container"
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  + Add
                </button>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-500/20 border border-purple-500 text-purple-300 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-lg shadow-lg shadow-blue-500/50 transition-all"
            >
              🚀 Register Agent
            </button>
            <button
              type="button"
              onClick={() => router.push('/agents')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-white mb-2">Agent Registered!</h2>
              <p className="text-slate-400 mb-6">
                <span className="text-blue-400 font-semibold">{registeredAgent}</span> has been successfully registered to the platform.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/agents')}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-lg transition-all"
                >
                  View All Agents
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    // Reset form
                    setFormData({
                      name: '',
                      type: '',
                      category: '',
                      description: '',
                      version: '1.0.0',
                      endpoint: '',
                      healthCheckEndpoint: '',
                      capabilities: [],
                      configuration: {
                        timeout: 30,
                        retries: 3,
                        rateLimit: 100,
                      },
                      authentication: {
                        type: 'none',
                        credentials: '',
                      },
                      tags: [],
                    });
                  }}
                  className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                >
                  Register Another Agent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob
