// Types for real-time workflow execution with SSE streaming
// Matches backend schemas from multi-agent-security/api/schemas/workflow_events.py

export interface WorkflowTriggerRequest {
  repo_url: string;
  branch?: string;
  triggered_by?: string;
  repository_access?: 'public' | 'private';
  private_repository?: PrivateRepositoryConnection;
}

export interface WorkflowRepositoryRequest {
  repo_url: string;
  branch?: string;
  commit_sha?: string;
  repository_access?: 'public' | 'private';
  private_repository?: PrivateRepositoryConnection;
}

export interface PrivateRepositoryConnection {
  provider?: string;
  auth_method?: string;
  username?: string;
  credential_reference?: string;
  installation_id?: string;
  access_token?: string;
  ssh_private_key?: string;
}

export interface WorkflowBatchTriggerRequest {
  repo_urls?: string[];
  repositories?: WorkflowRepositoryRequest[];
  branch?: string;
  max_concurrency?: number;
  triggered_by?: string;
}

export interface AgentError {
  message: string;
  details?: string;
}

export interface RepoScopedWorkflowEvent {
  repo_url?: string;
  repo_index?: number;
}

export interface AgentStatusEvent {
  event: 'agent_status';
  agent: string;
  status: 'started' | 'completed' | 'failed';
  timestamp: string;
  data?: Record<string, any>;
  error?: AgentError;
  message?: string;
  repo_url?: string;
  repo_index?: number;
}

export interface WorkflowCompletedEvent {
  event: 'workflow_completed';
  status: 'completed' | 'failed';
  timestamp: string;
  message?: string;
  summary?: Record<string, any>;
  data?: Record<string, any>;
  error?: AgentError;
  repo_url?: string;
  repo_index?: number;
}

export interface WorkflowStartedEvent {
  event: 'workflow_started';
  timestamp: string;
  message?: string;
  data?: Record<string, any>;
  status?: string;
  agent?: string;
  repo_url?: string;
  repo_index?: number;
}

export interface WorkflowFailedEvent {
  event: 'workflow_failed';
  timestamp: string;
  message?: string;
  error?: AgentError;
  data?: Record<string, any>;
  status?: string;
  agent?: string;
  repo_url?: string;
  repo_index?: number;
}

export interface BatchStartedEvent {
  event: 'batch_started';
  status: 'started';
  timestamp: string;
  total_repositories: number;
  max_concurrency: number;
}

export interface BatchCompletedResult {
  repo_url: string;
  branch?: string;
  commit_sha?: string;
  status: 'completed' | 'failed';
  error?: AgentError;
  total_vulnerabilities?: number;
  validation_passed?: boolean;
  report_path?: string;
  pr_link?: string;
}

export interface BatchCompletedEvent {
  event: 'batch_completed';
  status: 'completed' | 'failed';
  timestamp: string;
  summary?: {
    total_repositories: number;
    completed: number;
    failed: number;
  };
  results?: BatchCompletedResult[];
  error?: AgentError;
}

export interface GenericWorkflowEvent {
  event: string;
  timestamp: string;
  agent?: string;
  status?: string;
  message?: string;
  data?: Record<string, any>;
  error?: AgentError;
  repo_url?: string;
  repo_index?: number;
}

export type WorkflowEvent =
  | AgentStatusEvent
  | WorkflowCompletedEvent
  | WorkflowStartedEvent
  | WorkflowFailedEvent
  | BatchStartedEvent
  | BatchCompletedEvent
  | GenericWorkflowEvent;

export interface WorkflowStep {
  id: string;
  name: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  data?: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  repo_url: string;
  branch: string;
  triggered_by: string;
  status: 'running' | 'completed' | 'failed';
  steps: WorkflowStep[];
  startTime: string;
  endTime?: string;
  summary?: {
    total_vulnerabilities: number;
    remediated: number;
    validation: string;
  };
}

export interface VulnerabilityFinding {
  ecosystem: string;
  package: string;
  severity: string;
  vulnerable_version: string;
  patched_version: string;
  cve: string;
  overview: string;
  recommendation: string;
}

export interface AnalysisResult {
  ecosystem: string;
  dependency: string;
  issue_type: string;
  severity: string;
  current_version: string;
  recommended_version: string;
  explanation: string;
  fix_strategy: string;
  cve: string;
  cwe: string;
  vulnerable_range: string;
  patched_versions: string;
}

export interface RemediationResult {
  dependency: string;
  old_version: string;
  new_version: string;
  llm_used: boolean;
  llm_raw?: Record<string, any>;
  notes: string;
}

export interface ValidationResult {
  passed: boolean;
  details: string;
}

export interface PullRequestResult {
  url: string;
  id: number;
  html_url: string;
  number: number;
  state: string;
  title: string;
  body: string;
  created_at: string;
}

// Made with Bob
