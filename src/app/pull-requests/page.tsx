'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, GitPullRequest, RefreshCcw } from 'lucide-react';
import {
  extractPullRequests,
  mergeStoredPullRequests,
  readWorkflowMemory,
  StoredPullRequest,
} from '@/lib/workflow-memory';

const ALL_REPOSITORIES = '__all__';

interface RepositoryOption {
  key: string;
  label: string;
  total: number;
  open: number;
}

function getStatusClass(status?: string) {
  switch (status?.toLowerCase()) {
    case 'open':
      return 'border-green-500/30 bg-green-500/10 text-green-300';
    case 'merged':
    case 'completed':
      return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
    case 'closed':
    case 'failed':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    default:
      return 'border-slate-600 bg-slate-800 text-slate-300';
  }
}

function getDescriptionPreview(description?: string) {
  if (!description) {
    return 'No PR description saved yet.';
  }

  return description
    .replace(/[#*_`>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function formatDate(timestamp?: string) {
  if (!timestamp) {
    return '-';
  }

  return new Date(timestamp).toLocaleString();
}

function getRepositoryKey(item: StoredPullRequest) {
  return item.repositoryUrl || item.repositoryName || 'Unknown repository';
}

function getRepositoryLabel(item: StoredPullRequest) {
  return item.repositoryName || item.repositoryUrl || 'Unknown repository';
}

function buildRepositoryOptions(items: StoredPullRequest[]): RepositoryOption[] {
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
    if (item.status?.toLowerCase() === 'open') {
      option.open += 1;
    }

    repositories.set(key, option);
  });

  return [
    {
      key: ALL_REPOSITORIES,
      label: 'All repositories',
      total: items.length,
      open: items.filter(item => item.status?.toLowerCase() === 'open').length,
    },
    ...Array.from(repositories.values()).sort((a, b) => a.label.localeCompare(b.label)),
  ];
}

export default function PullRequestsPage() {
  const [pullRequests, setPullRequests] = useState<StoredPullRequest[]>([]);
  const [activeRepository, setActiveRepository] = useState(ALL_REPOSITORIES);
  const [memoryUpdatedAt, setMemoryUpdatedAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const memory = readWorkflowMemory();
    setMemoryUpdatedAt(memory.updatedAt);

    try {
      const response = await fetch('/mock-data/pull-requests.json');
      const data = await response.json();
      const mockRows = extractPullRequests(data, {
        workflowId: 'mock-data',
        agent: 'seed-pull-requests',
        stepName: 'pull-requests',
      });

      setPullRequests(mergeStoredPullRequests(mockRows, memory.pullRequests));
    } catch (error) {
      console.error('Error loading pull requests:', error);
      setPullRequests(memory.pullRequests);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const repositoryOptions = useMemo(() => buildRepositoryOptions(pullRequests), [pullRequests]);

  useEffect(() => {
    if (!repositoryOptions.some(option => option.key === activeRepository)) {
      setActiveRepository(ALL_REPOSITORIES);
    }
  }, [activeRepository, repositoryOptions]);

  const visiblePullRequests = useMemo(() => {
    if (activeRepository === ALL_REPOSITORIES) {
      return pullRequests;
    }

    return pullRequests.filter(item => getRepositoryKey(item) === activeRepository);
  }, [activeRepository, pullRequests]);

  const metrics = useMemo(() => {
    return {
      total: visiblePullRequests.length,
      open: visiblePullRequests.filter(item => item.status?.toLowerCase() === 'open').length,
      linked: visiblePullRequests.filter(item => item.vulnerabilityId).length,
    };
  }, [visiblePullRequests]);

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3 text-slate-300">
              <GitPullRequest className="h-6 w-6 text-purple-300" />
              <span className="text-sm uppercase tracking-wide">Automated remediation</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-2">Pull Requests</h1>
            <p className="text-sm text-slate-400 mt-1">
              PR details from mock data plus saved workflow agent output.
            </p>
          </div>

          <button
            onClick={() => void loadData()}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-blue-500"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs text-slate-500">Total PRs</div>
            <div className="text-2xl font-bold text-white mt-1">{metrics.total}</div>
          </div>
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
            <div className="text-xs text-green-200/70">Open</div>
            <div className="text-2xl font-bold text-green-200 mt-1">{metrics.open}</div>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="text-xs text-blue-200/70">Linked Vulnerabilities</div>
            <div className="text-2xl font-bold text-blue-200 mt-1">{metrics.linked}</div>
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
          <div className="flex flex-col gap-2 border-b border-slate-800 p-4 md:flex-row md:items-center md:justify-between">
            <div className="font-semibold text-white">Saved PR Details</div>
            <div className="text-xs text-slate-500">
              Temp memory updated: {memoryUpdatedAt ? formatDate(memoryUpdatedAt) : 'Not saved yet'}
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="py-16 text-center text-slate-400">Loading pull requests...</div>
            ) : visiblePullRequests.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {visiblePullRequests.map(pr => {
                  const labels = pr.labels ?? [];
                  const reviewers = pr.reviewers ?? [];

                  return (
                    <div key={pr.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-white">
                              {pr.number ? `#${pr.number} ` : ''}{pr.title}
                            </span>
                            <span className={`rounded border px-2 py-1 text-xs font-medium ${getStatusClass(pr.status)}`}>
                              {pr.status || 'unknown'}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {[pr.repositoryName || pr.repositoryUrl, pr.branch, pr.baseBranch, pr.vulnerabilityId, pr.workflowId].filter(Boolean).join(' | ')}
                          </div>
                        </div>

                        {pr.url && (
                          <a
                            href={pr.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 px-3 py-2 text-sm text-blue-300 hover:border-blue-400 hover:text-blue-200"
                          >
                            Open
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-300">
                        {getDescriptionPreview(pr.description)}
                      </p>

                      {(labels.length > 0 || reviewers.length > 0) && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {labels.map(label => (
                            <span key={label} className="rounded border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-xs text-purple-200">
                              {label}
                            </span>
                          ))}
                          {reviewers.map(reviewer => (
                            <span key={reviewer} className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
                              {reviewer}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 text-sm sm:grid-cols-3">
                        <div>
                          <div className="text-xs text-slate-500">Created</div>
                          <div className="text-slate-200">{formatDate(pr.createdAt)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Source Agent</div>
                          <div className="text-slate-200">{pr.sourceAgent || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Changes</div>
                          <div className="text-slate-200">
                            {pr.changedFiles ? `${pr.changedFiles} files` : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400">
                No pull request data has been saved yet. Run or open a workflow to populate temporary memory.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
