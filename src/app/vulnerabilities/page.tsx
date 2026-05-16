'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, GitPullRequest, RefreshCcw, Trash2 } from 'lucide-react';
import {
  clearWorkflowMemory,
  extractVulnerabilities,
  mergeStoredVulnerabilities,
  readWorkflowMemory,
  StoredVulnerability,
} from '@/lib/workflow-memory';

type VulnerabilityTab = 'detected' | 'remediation';

const ALL_REPOSITORIES = '__all__';

interface RepositoryOption {
  key: string;
  label: string;
  total: number;
  open: number;
}

function getSeverityClass(severity?: string) {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    case 'high':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-300';
    case 'medium':
      return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
    case 'low':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    default:
      return 'border-slate-600 bg-slate-800 text-slate-300';
  }
}

function getStatusClass(status?: string) {
  switch (status?.toLowerCase()) {
    case 'fixed':
    case 'resolved':
    case 'completed':
      return 'border-green-500/30 bg-green-500/10 text-green-300';
    case 'in_progress':
    case 'open':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    case 'failed':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    default:
      return 'border-slate-600 bg-slate-800 text-slate-300';
  }
}

function formatDate(timestamp?: string) {
  if (!timestamp) {
    return 'Not saved yet';
  }

  return new Date(timestamp).toLocaleString();
}

function getRepositoryKey(item: StoredVulnerability) {
  return item.repositoryUrl || item.repositoryName || 'Unknown repository';
}

function getRepositoryLabel(item: StoredVulnerability) {
  return item.repositoryName || item.repositoryUrl || 'Unknown repository';
}

function buildRepositoryOptions(items: StoredVulnerability[]): RepositoryOption[] {
  const repositories = new Map<string, RepositoryOption>();

  items.forEach(item => {
    const key = getRepositoryKey(item);
    const existing = repositories.get(key);
    const option = existing || {
      key,
      label: getRepositoryLabel(item),
      total: 0,
      open: 0,
    };

    option.total += 1;
    if ((item.status || 'open').toLowerCase() === 'open') {
      option.open += 1;
    }

    repositories.set(key, option);
  });

  return [
    {
      key: ALL_REPOSITORIES,
      label: 'All repositories',
      total: items.length,
      open: items.filter(item => (item.status || 'open').toLowerCase() === 'open').length,
    },
    ...Array.from(repositories.values()).sort((a, b) => a.label.localeCompare(b.label)),
  ];
}

export default function VulnerabilitiesPage() {
  const [activeTab, setActiveTab] = useState<VulnerabilityTab>('detected');
  const [activeRepository, setActiveRepository] = useState(ALL_REPOSITORIES);
  const [vulnerabilities, setVulnerabilities] = useState<StoredVulnerability[]>([]);
  const [memoryUpdatedAt, setMemoryUpdatedAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const memory = readWorkflowMemory();
    setMemoryUpdatedAt(memory.updatedAt);

    try {
      const response = await fetch('/mock-data/vulnerabilities.json');
      const data = await response.json();
      const mockRows = extractVulnerabilities(data, {
        workflowId: 'mock-data',
        agent: 'seed-vulnerabilities',
        stepName: 'vulnerabilities',
      });

      setVulnerabilities(mergeStoredVulnerabilities(mockRows, memory.vulnerabilities));
    } catch (error) {
      console.error('Error loading vulnerabilities:', error);
      setVulnerabilities(memory.vulnerabilities);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const repositoryOptions = useMemo(() => buildRepositoryOptions(vulnerabilities), [vulnerabilities]);

  useEffect(() => {
    if (!repositoryOptions.some(option => option.key === activeRepository)) {
      setActiveRepository(ALL_REPOSITORIES);
    }
  }, [activeRepository, repositoryOptions]);

  const visibleVulnerabilities = useMemo(() => {
    if (activeRepository === ALL_REPOSITORIES) {
      return vulnerabilities;
    }

    return vulnerabilities.filter(item => getRepositoryKey(item) === activeRepository);
  }, [activeRepository, vulnerabilities]);

  const metrics = useMemo(() => {
    return {
      total: visibleVulnerabilities.length,
      open: visibleVulnerabilities.filter(item => (item.status || 'open').toLowerCase() === 'open').length,
      critical: visibleVulnerabilities.filter(item => item.severity?.toLowerCase() === 'critical').length,
      high: visibleVulnerabilities.filter(item => item.severity?.toLowerCase() === 'high').length,
      withPr: visibleVulnerabilities.filter(item => item.prId || item.prUrl).length,
    };
  }, [visibleVulnerabilities]);

  const remediationRows = visibleVulnerabilities.filter(item => item.status || item.prId || item.prUrl || item.remediationJobId);

  const handleClearMemory = () => {
    clearWorkflowMemory();
    void loadData();
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3 text-slate-300">
              <AlertTriangle className="h-6 w-6 text-red-300" />
              <span className="text-sm uppercase tracking-wide">Security findings</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-2">Vulnerabilities</h1>
            <p className="text-sm text-slate-400 mt-1">
              Findings from mock data plus agent output saved in temporary workflow memory.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void loadData()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-blue-500"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleClearMemory}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:border-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Clear Temp Memory
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs text-slate-500">Total</div>
            <div className="text-2xl font-bold text-white mt-1">{metrics.total}</div>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="text-xs text-blue-200/70">Open</div>
            <div className="text-2xl font-bold text-blue-200 mt-1">{metrics.open}</div>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <div className="text-xs text-red-200/70">Critical</div>
            <div className="text-2xl font-bold text-red-200 mt-1">{metrics.critical}</div>
          </div>
          <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-4">
            <div className="text-xs text-orange-200/70">High</div>
            <div className="text-2xl font-bold text-orange-200 mt-1">{metrics.high}</div>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="text-xs text-blue-200/70">Linked PRs</div>
            <div className="text-2xl font-bold text-blue-200 mt-1">{metrics.withPr}</div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Repositories</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {repositoryOptions.map(option => (
              <button
                key={option.key}
                onClick={() => setActiveRepository(option.key)}
                className={`shrink-0 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  activeRepository === option.key
                    ? 'border-blue-500 bg-blue-500/15 text-blue-100'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {option.open} open / {option.total} total
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-800 p-4 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-1">
              <button
                onClick={() => setActiveTab('detected')}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === 'detected' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Database className="h-4 w-4" />
                Detected
              </button>
              <button
                onClick={() => setActiveTab('remediation')}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === 'remediation' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <GitPullRequest className="h-4 w-4" />
                Remediation
              </button>
            </div>
            <div className="text-xs text-slate-500">Temp memory updated: {formatDate(memoryUpdatedAt)}</div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="py-16 text-center text-slate-400">Loading vulnerabilities...</div>
            ) : activeTab === 'detected' ? (
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">Finding</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">Severity</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">Component</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">PR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleVulnerabilities.map(item => (
                      <tr key={item.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{item.title}</div>
                          <div className="text-xs text-slate-500">
                            {[item.cve || item.cwe || item.id, item.repositoryName || item.repositoryUrl].filter(Boolean).join(' | ')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded border px-2 py-1 text-xs font-medium ${getSeverityClass(item.severity)}`}>
                            {item.severity || 'unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          <div>{item.packageName || item.affectedComponent || item.filePath || '-'}</div>
                          <div className="text-xs text-slate-500">
                            {[item.currentVersion || item.vulnerableVersion, item.fixedVersion && `fixed ${item.fixedVersion}`].filter(Boolean).join(' -> ')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded border px-2 py-1 text-xs font-medium ${getStatusClass(item.status)}`}>
                            {item.status || 'detected'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.prUrl ? (
                            <a href={item.prUrl} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200">
                              {item.prId || 'Open PR'}
                            </a>
                          ) : item.issueUrl ? (
                            <a href={item.issueUrl} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200">
                              {item.issueNumber ? `Issue #${item.issueNumber}` : 'Open Issue'}
                            </a>
                          ) : (
                            <span className="text-slate-600">{item.prId || '-'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : remediationRows.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {remediationRows.map(item => (
                  <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">{item.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {[item.id, item.repositoryName || item.repositoryUrl].filter(Boolean).join(' | ')}
                        </div>
                      </div>
                      <span className={`rounded border px-2 py-1 text-xs font-medium ${getStatusClass(item.status)}`}>
                        {item.status || 'tracked'}
                      </span>
                    </div>
                    {(item.recommendation || item.overview) && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">
                        {item.recommendation || item.overview}
                      </p>
                    )}
                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-slate-500">Remediation Job</div>
                        <div className="text-slate-200">{item.remediationJobId || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Pull Request</div>
                        {item.prUrl ? (
                          <a href={item.prUrl} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200">
                            {item.prId || item.prUrl}
                          </a>
                        ) : (
                          <div className="text-slate-200">{item.prId || '-'}</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">GitHub Issue</div>
                        {item.issueUrl ? (
                          <a href={item.issueUrl} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200">
                            {item.issueNumber ? `#${item.issueNumber}` : item.issueUrl}
                          </a>
                        ) : (
                          <div className="text-slate-200">-</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Workflow</div>
                        <div className="text-slate-200">{item.workflowId || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Saved From</div>
                        <div className="text-slate-200">{item.sourceAgent || '-'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400">
                No remediation data has been saved yet. Run or open a workflow to populate temporary memory.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
