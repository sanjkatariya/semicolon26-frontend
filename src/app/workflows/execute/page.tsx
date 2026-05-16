'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Play, Trash2 } from 'lucide-react';
import { WorkflowAPIClient } from '@/lib/workflow-api';
import { WorkflowEvent, WorkflowRepositoryRequest } from '@/types/workflow-execution';
import WorkflowCard from '@/components/WorkflowCard';
import { rememberAgentResult } from '@/lib/workflow-memory';

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

interface WorkflowInstance {
  id: string;
  repoUrl: string;
  repoIndex: number;
  branch: string;
  triggeredBy: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  currentStep: number;
  steps: ExecutionStep[];
  events: WorkflowEvent[];
  startTime: string;
  eventSource?: EventSource;
  isExpanded: boolean;
}

interface RepositoryInput {
  id: string;
  repo_url: string;
  branch: string;
}

const initialSteps: ExecutionStep[] = [
  { id: 1, name: 'Repository Scan', agent: 'scanner_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 2, name: 'GitHub Issues', agent: 'github_issue_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 3, name: 'Vulnerability Analysis', agent: 'analysis_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 4, name: 'Remediation', agent: 'remediation_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 5, name: 'Validation', agent: 'validation_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
  { id: 6, name: 'Pull Request', agent: 'pr_agent', status: 'pending', duration: 0, progress: 0, input: {}, output: {} },
];

const ENABLE_MOCK_DATA = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true';
const DEFAULT_BRANCH = 'main';
const DEFAULT_MAX_CONCURRENCY = 3;
const DEFAULT_TRIGGERED_BY = 'ui';

function generateInputId() {
  return `repo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateWorkflowId(index: number) {
  return `wf_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 9)}`;
}

function createRepositoryInput(repoUrl = '', branch = DEFAULT_BRANCH): RepositoryInput {
  return {
    id: generateInputId(),
    repo_url: repoUrl,
    branch,
  };
}

function cloneInitialSteps(): ExecutionStep[] {
  return initialSteps.map(step => ({
    ...step,
    input: {},
    output: {},
  }));
}

function getScopedRepoIndex(event: WorkflowEvent, targets: WorkflowRepositoryRequest[]) {
  if ('repo_index' in event && typeof event.repo_index === 'number') {
    return event.repo_index;
  }

  if ('repo_url' in event && typeof event.repo_url === 'string') {
    const matchedIndex = targets.findIndex(target => target.repo_url === event.repo_url);
    return matchedIndex >= 0 ? matchedIndex : undefined;
  }

  return undefined;
}

function getBatchResults(event: WorkflowEvent) {
  return 'results' in event && Array.isArray(event.results) ? event.results : [];
}

function getBatchSummary(event: WorkflowEvent) {
  return 'summary' in event && event.summary ? event.summary : undefined;
}

export default function ExecuteWorkflowPage() {
  const router = useRouter();
  const batchStreamRef = useRef<EventSource | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [repositoryInputs, setRepositoryInputs] = useState<RepositoryInput[]>([
    createRepositoryInput(
      ENABLE_MOCK_DATA ? 'https://github.com/kim815/vulnerable-repo' : '',
      DEFAULT_BRANCH
    ),
  ]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      batchStreamRef.current?.close();
      setWorkflows(currentWorkflows => {
        currentWorkflows.forEach(wf => wf.eventSource?.close());
        return currentWorkflows;
      });
    };
  }, []);

  const updateRepositoryInput = (id: string, changes: Partial<Omit<RepositoryInput, 'id'>>) => {
    setRepositoryInputs(prev =>
      prev.map(input => (input.id === id ? { ...input, ...changes } : input))
    );
  };

  const addRepositoryInput = () => {
    setRepositoryInputs(prev => [...prev, createRepositoryInput()]);
  };

  const removeRepositoryInput = (id: string) => {
    setRepositoryInputs(prev => {
      if (prev.length === 1) {
        return [createRepositoryInput()];
      }

      return prev.filter(input => input.id !== id);
    });
  };

  const buildRepositoryTargets = (): WorkflowRepositoryRequest[] | null => {
    const emptyIndex = repositoryInputs.findIndex(input => !input.repo_url.trim());
    if (emptyIndex !== -1) {
      alert(`Repository ${emptyIndex + 1} needs a URL before triggering the batch.`);
      return null;
    }

    const targets = repositoryInputs.map(input => ({
      repo_url: input.repo_url.trim(),
      branch: input.branch.trim() || DEFAULT_BRANCH,
      commit_sha: 'HEAD',
    }));
    const duplicateUrl = targets.find((target, index) =>
      targets.findIndex(candidate => candidate.repo_url === target.repo_url) !== index
    );

    if (duplicateUrl) {
      alert(`Remove the duplicate repository URL before triggering: ${duplicateUrl.repo_url}`);
      return null;
    }

    return targets;
  };

  const rememberRepoEvent = (
    workflowId: string,
    target: WorkflowRepositoryRequest,
    event: WorkflowEvent
  ) => {
    if (event.event === 'agent_status' && event.agent && (event.status === 'completed' || event.status === 'failed')) {
      try {
        const stepName = initialSteps.find(step => step.agent === event.agent)?.name || event.agent;
        rememberAgentResult({
          workflowId,
          agent: event.agent,
          stepName,
          status: event.status,
          timestamp: event.timestamp,
          repoUrl: target.repo_url,
          branch: target.branch || DEFAULT_BRANCH,
          output: event.status === 'failed'
            ? { error: event.error?.message || 'Unknown error' }
            : event.data || {},
        });
      } catch (memoryError) {
        console.warn(`[${workflowId}] Failed to save temporary agent result`, memoryError);
      }
    }

    if (event.event === 'workflow_completed') {
      try {
        const workflowSummary = 'summary' in event ? event.summary : undefined;
        const workflowStatus = event.status === 'failed' ? 'failed' : 'completed';
        rememberAgentResult({
          workflowId,
          agent: 'workflow',
          stepName: 'Workflow Summary',
          status: workflowStatus,
          timestamp: event.timestamp,
          repoUrl: target.repo_url,
          branch: target.branch || DEFAULT_BRANCH,
          output: workflowSummary || ('data' in event ? event.data : undefined) || {},
        });
      } catch (memoryError) {
        console.warn(`[${workflowId}] Failed to save temporary workflow summary`, memoryError);
      }
    }
  };

  const applyRepoEvent = (
    workflowId: string,
    target: WorkflowRepositoryRequest,
    event: WorkflowEvent
  ) => {
    rememberRepoEvent(workflowId, target, event);

    setWorkflows(prev => prev.map(wf => {
      if (wf.id !== workflowId) return wf;

      const updatedEvents = [...wf.events, event];
      const updatedSteps = [...wf.steps];
      let updatedStatus = wf.status;
      let updatedCurrentStep = wf.currentStep;

      if (event.event === 'agent_status' && event.agent) {
        const agentIndex = updatedSteps.findIndex(step => step.agent === event.agent);
        if (agentIndex !== -1) {
          if (event.status === 'started') {
            updatedStatus = 'running';
            updatedCurrentStep = agentIndex;
            updatedSteps[agentIndex] = {
              ...updatedSteps[agentIndex],
              status: 'running',
              startTime: event.timestamp,
              progress: 50,
              input: { repository_url: target.repo_url, branch: target.branch || DEFAULT_BRANCH },
            };
          } else if (event.status === 'completed') {
            const startTime = updatedSteps[agentIndex].startTime;
            const duration = startTime
              ? Math.round((new Date(event.timestamp).getTime() - new Date(startTime).getTime()) / 1000)
              : 0;
            updatedSteps[agentIndex] = {
              ...updatedSteps[agentIndex],
              status: 'completed',
              endTime: event.timestamp,
              progress: 100,
              duration,
              output: event.data || {},
            };
          } else if (event.status === 'failed') {
            updatedSteps[agentIndex] = {
              ...updatedSteps[agentIndex],
              status: 'failed',
              endTime: event.timestamp,
              progress: 100,
              output: { error: event.error?.message || 'Unknown error' },
            };
            updatedStatus = 'failed';
          }
        }
      } else if (event.event === 'workflow_completed') {
        updatedStatus = event.status === 'failed' ? 'failed' : 'completed';
      }

      return {
        ...wf,
        events: updatedEvents,
        steps: updatedSteps,
        status: updatedStatus,
        currentStep: updatedCurrentStep,
      };
    }));
  };

  const applyBatchCompleted = (
    event: WorkflowEvent,
    workflowIdByIndex: Map<number, string>,
    repoIndexByWorkflowId: Map<string, number>,
    targets: WorkflowRepositoryRequest[]
  ) => {
    const results = getBatchResults(event);
    const summary = getBatchSummary(event);
    const batchFailed = 'status' in event && event.status === 'failed';
    const batchErrorMessage = 'error' in event ? event.error?.message : undefined;

    if (batchErrorMessage) {
      setBatchError(batchErrorMessage);
    }

    if (summary && 'completed' in summary && 'failed' in summary) {
      setBatchMessage(
        `Batch finished: ${summary.completed} completed, ${summary.failed} failed.`
      );
    } else {
      setBatchMessage('Batch finished.');
    }

    setIsTriggering(false);

    setWorkflows(prev => prev.map(wf => {
      const repoIndex = repoIndexByWorkflowId.get(wf.id);
      if (repoIndex === undefined) return wf;

      const target = targets[repoIndex];
      const result =
        results.find(item => item.repo_url === target.repo_url) ||
        results[repoIndex];

      if (!result) {
        if (batchFailed && (wf.status === 'pending' || wf.status === 'running')) {
          return {
            ...wf,
            status: 'failed',
            events: [...wf.events, event],
          };
        }

        return wf;
      }

      const nextStatus = result.status === 'completed' ? 'completed' : 'failed';
      if (wf.status === 'completed' || wf.status === 'failed') {
        return wf;
      }

      return {
        ...wf,
        status: nextStatus,
        events: [...wf.events, event],
      };
    }));

    results.forEach((result, index) => {
      const workflowId = workflowIdByIndex.get(index);
      if (!workflowId) return;

      try {
        rememberAgentResult({
          workflowId,
          agent: 'batch',
          stepName: 'Batch Summary',
          status: result.status,
          timestamp: event.timestamp,
          repoUrl: result.repo_url,
          branch: result.branch || targets[index]?.branch || DEFAULT_BRANCH,
          output: result,
        });
      } catch (memoryError) {
        console.warn(`[${workflowId}] Failed to save temporary batch summary`, memoryError);
      }
    });
  };

  const triggerBatchWorkflow = () => {
    if (isTriggering) return;

    const targets = buildRepositoryTargets();
    if (!targets) return;

    const workflowIdByIndex = new Map<number, string>();
    const repoIndexByWorkflowId = new Map<string, number>();
    const startTime = new Date().toISOString();
    const nextWorkflows: WorkflowInstance[] = targets.map((target, index) => {
      const id = generateWorkflowId(index);
      workflowIdByIndex.set(index, id);
      repoIndexByWorkflowId.set(id, index);

      return {
        id,
        repoUrl: target.repo_url,
        repoIndex: index,
        branch: target.branch || DEFAULT_BRANCH,
        triggeredBy: DEFAULT_TRIGGERED_BY,
        status: 'pending',
        currentStep: 0,
        steps: cloneInitialSteps(),
        events: [],
        startTime,
        isExpanded: index === 0,
      };
    });

    setWorkflows(prev => [...nextWorkflows, ...prev]);
    setBatchError(null);
    setBatchMessage(`Batch queued for ${targets.length} ${targets.length === 1 ? 'repository' : 'repositories'}.`);
    setIsTriggering(true);

    batchStreamRef.current?.close();
    batchStreamRef.current = WorkflowAPIClient.triggerBatchWorkflow(
      {
        repositories: targets,
        max_concurrency: DEFAULT_MAX_CONCURRENCY,
        triggered_by: DEFAULT_TRIGGERED_BY,
      },
      (event: WorkflowEvent) => {
        console.log('[ExecuteWorkflow] Batch event received:', event);

        if (event.event === 'batch_started') {
          const totalRepositories =
            'total_repositories' in event ? event.total_repositories : targets.length;
          setBatchMessage(
            `Batch started for ${totalRepositories} repositories.`
          );
          return;
        }

        if (event.event === 'batch_completed') {
          applyBatchCompleted(event, workflowIdByIndex, repoIndexByWorkflowId, targets);
          return;
        }

        const repoIndex = getScopedRepoIndex(event, targets);
        if (repoIndex === undefined) {
          return;
        }

        const workflowId = workflowIdByIndex.get(repoIndex);
        const target = targets[repoIndex];
        if (!workflowId || !target) {
          return;
        }

        applyRepoEvent(workflowId, target, event);
      },
      (error: Error) => {
        console.error('[ExecuteWorkflow] Batch stream error:', error);
        setBatchError(error.message);
        setBatchMessage(null);
        setIsTriggering(false);
        setWorkflows(prev => prev.map(wf =>
          repoIndexByWorkflowId.has(wf.id) ? { ...wf, status: 'failed' } : wf
        ));
      },
      () => {
        console.log('[ExecuteWorkflow] Batch stream completed');
        setIsTriggering(false);
      }
    );
  };

  const removeWorkflow = (workflowId: string) => {
    const workflow = workflows.find(wf => wf.id === workflowId);
    workflow?.eventSource?.close();
    setWorkflows(prev => prev.filter(wf => wf.id !== workflowId));
  };

  const toggleWorkflowExpand = (workflowId: string) => {
    setWorkflows(prev => prev.map(wf =>
      wf.id === workflowId ? { ...wf, isExpanded: !wf.isExpanded } : wf
    ));
  };

  const runningCount = workflows.filter(w => w.status === 'running').length;
  const completedCount = workflows.filter(w => w.status === 'completed').length;
  const failedCount = workflows.filter(w => w.status === 'failed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white">
      <div className="sticky top-0 z-40 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <button
            onClick={() => router.push('/workflows')}
            className="mb-4 inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm transition-colors hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workflows
          </button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Execute Workflows</h1>
              <p className="text-sm text-gray-400">Trigger one batch run across multiple repositories</p>
            </div>
            <button
              onClick={addRepositoryInput}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-5 py-3 font-semibold transition-colors hover:bg-gray-700"
            >
              <Plus className="h-5 w-5" />
              Add Repository
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-6 rounded-lg border border-gray-700 bg-gray-800/50 p-6 backdrop-blur-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Batch Trigger</h2>
              <p className="text-sm text-gray-400">Add repository targets, then start the backend batch workflow.</p>
            </div>
          </div>

          <div className="space-y-3">
            {repositoryInputs.map((input, index) => (
              <div
                key={input.id}
                className="grid grid-cols-1 gap-3 rounded-lg border border-gray-700 bg-gray-900/70 p-4 md:grid-cols-[minmax(0,1fr)_180px_44px]"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Repository URL {index + 1}
                  </label>
                  <input
                    type="text"
                    value={input.repo_url}
                    onChange={(e) => updateRepositoryInput(input.id, { repo_url: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                    placeholder="https://github.com/user/repo"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Branch
                  </label>
                  <select
                    value={input.branch}
                    onChange={(e) => updateRepositoryInput(input.id, { branch: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={DEFAULT_BRANCH}>main</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeRepositoryInput(input.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-gray-300 transition-colors hover:bg-red-600 hover:text-white"
                    aria-label={`Remove repository ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={addRepositoryInput}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Add another repository
            </button>
          </div>

          {batchError && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {batchError}
            </div>
          )}
          {batchMessage && !batchError && (
            <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
              {batchMessage}
            </div>
          )}

          <div className="mt-5">
            <button
              type="button"
              onClick={triggerBatchWorkflow}
              disabled={isTriggering}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold transition-all hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Play className="h-5 w-5" />
              {isTriggering ? 'Triggering Batch...' : 'Trigger Batch'}
            </button>
          </div>
        </section>

        {workflows.length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-12 text-center backdrop-blur-sm">
            <h3 className="mb-2 text-xl font-semibold">No Workflow Runs</h3>
            <p className="text-gray-400">Add repository targets and trigger a batch to start live tracking.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workflows.map(workflow => (
              <WorkflowCard
                key={workflow.id}
                id={workflow.id}
                repoUrl={workflow.repoUrl}
                branch={workflow.branch}
                status={workflow.status}
                currentStep={workflow.currentStep}
                steps={workflow.steps}
                events={workflow.events}
                startTime={workflow.startTime}
                onClose={() => removeWorkflow(workflow.id)}
                isExpanded={workflow.isExpanded}
                onToggleExpand={() => toggleWorkflowExpand(workflow.id)}
              />
            ))}
          </div>
        )}

        {workflows.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-purple-400">{workflows.length}</div>
              <div className="text-sm text-gray-400">Total Workflows</div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-yellow-400">{runningCount}</div>
              <div className="text-sm text-gray-400">Running</div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-green-400">{completedCount}</div>
              <div className="text-sm text-gray-400">Completed</div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-red-400">{failedCount}</div>
              <div className="text-sm text-gray-400">Failed</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
