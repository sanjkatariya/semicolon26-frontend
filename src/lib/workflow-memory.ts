'use client';

export type AgentSummaryTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface StoredAgentSummaryItem {
  label: string;
  value: string;
  tone?: AgentSummaryTone;
}

export interface StoredAgentResult {
  id: string;
  workflowId: string;
  agent: string;
  stepName: string;
  status: string;
  timestamp: string;
  summary: StoredAgentSummaryItem[];
  output: Record<string, unknown>;
}

export interface StoredVulnerability {
  id: string;
  title: string;
  severity?: string;
  status?: string;
  cve?: string;
  cwe?: string;
  ecosystem?: string;
  cvssScore?: number;
  repositoryId?: string;
  repositoryName?: string;
  repositoryUrl?: string;
  packageName?: string;
  affectedComponent?: string;
  currentVersion?: string;
  vulnerableVersion?: string;
  filePath?: string;
  fixedVersion?: string;
  overview?: string;
  recommendation?: string;
  issueNumber?: number;
  issueUrl?: string;
  remediationJobId?: string;
  prId?: string;
  prUrl?: string;
  workflowId?: string;
  sourceAgent?: string;
  updatedAt?: string;
}

export interface StoredPullRequest {
  id: string;
  number?: number;
  title: string;
  description?: string;
  url?: string;
  status?: string;
  repositoryId?: string;
  repositoryName?: string;
  repositoryUrl?: string;
  branch?: string;
  baseBranch?: string;
  commitSha?: string;
  changedFiles?: number;
  additions?: number;
  deletions?: number;
  vulnerabilityId?: string;
  workflowId?: string;
  reviewers: string[];
  labels: string[];
  createdAt?: string;
  sourceAgent?: string;
}

export interface StoredRemediationPlan {
  id: string;
  vulnerabilityId?: string;
  strategy?: string;
  status?: string;
  summary?: string;
  agent?: string;
  workflowId?: string;
  confidence?: number;
  estimatedEffort?: string;
}

export interface WorkflowMemory {
  agentResults: StoredAgentResult[];
  vulnerabilities: StoredVulnerability[];
  pullRequests: StoredPullRequest[];
  plans: StoredRemediationPlan[];
  updatedAt?: string;
}

export interface AgentResultContext {
  workflowId?: string;
  agent?: string;
  stepName?: string;
  timestamp?: string;
  repoUrl?: string;
  branch?: string;
  repositoryName?: string;
}

export interface RememberAgentResultInput extends AgentResultContext {
  workflowId: string;
  agent: string;
  stepName: string;
  status: string;
  output: unknown;
}

const WORKFLOW_MEMORY_KEY = 'semicolon.workflow.memory.v1';

const EMPTY_MEMORY: WorkflowMemory = {
  agentResults: [],
  vulnerabilities: [],
  pullRequests: [],
  plans: [],
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function recordAt(record: Record<string, unknown> | undefined, key: string): Record<string, unknown> | undefined {
  if (!record) {
    return undefined;
  }

  return asRecord(record[key]);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeOutputRecord(value: unknown): Record<string, unknown> | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const nested =
    asRecord(record.output) ||
    asRecord(record.output_data) ||
    asRecord(record.result) ||
    asRecord(record.data);

  return nested ? { ...record, ...nested } : record;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }

  return undefined;
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return undefined;
}

function pickStringFromUnknown(value: unknown, keys: string[] = ['name', 'login', 'username', 'slug', 'id']): string {
  if (Array.isArray(value)) {
    return value.map(item => pickStringFromUnknown(item, keys)).find(Boolean) || '';
  }
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  const record = asRecord(value);
  return record ? pickString(record, keys) || '' : '';
}

function pickStringArray(record: Record<string, unknown>, keys: string[] | string): string[] {
  const keyList = Array.isArray(keys) ? keys : [keys];

  for (const key of keyList) {
    const values = asArray(record[key])
      .map(item => pickStringFromUnknown(item))
      .filter(Boolean);

    if (values.length > 0) {
      return values;
    }
  }

  return [];
}

function normalizeGitHubRepositoryUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  const match = url.match(/^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/]+)$/i);
  if (match) {
    return `https://github.com/${match[1]}/${match[2]}`;
  }

  return url;
}

function repositoryNameFromUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  const normalized = normalizeGitHubRepositoryUrl(url)?.replace(/\.git$/, '');
  const githubMatch = normalized?.match(/^https?:\/\/github\.com\/([^/]+\/[^/#?]+)/i);
  if (githubMatch) {
    return githubMatch[1];
  }

  const parts = normalized?.split('/').filter(Boolean);
  return parts?.length ? parts[parts.length - 1] : undefined;
}

function getNestedString(
  record: Record<string, unknown>,
  paths: string[][]
): string | undefined {
  for (const path of paths) {
    let current: unknown = record;

    for (const segment of path) {
      current = asRecord(current)?.[segment];
    }

    const value = pickStringFromUnknown(current);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function getRepositoryDetails(
  record: Record<string, unknown>,
  context: AgentResultContext = {}
): Pick<StoredPullRequest, 'repositoryId' | 'repositoryName' | 'repositoryUrl'> {
  const rawUrl =
    pickString(record, ['repository_url', 'repo_url']) ||
    getNestedString(record, [
      ['base', 'repo', 'html_url'],
      ['head', 'repo', 'html_url'],
      ['repository', 'html_url'],
    ]) ||
    context.repoUrl;
  const repositoryUrl = normalizeGitHubRepositoryUrl(rawUrl);
  const repositoryName =
    pickString(record, ['repository_name', 'repo_name', 'full_name']) ||
    getNestedString(record, [
      ['base', 'repo', 'full_name'],
      ['head', 'repo', 'full_name'],
      ['repository', 'full_name'],
      ['repository', 'name'],
    ]) ||
    context.repositoryName ||
    repositoryNameFromUrl(repositoryUrl);

  return {
    repositoryId: pickString(record, ['repository_id']),
    repositoryName,
    repositoryUrl,
  };
}

function collectRecordRows(
  record: Record<string, unknown> | undefined,
  arrayKeys: string[],
  singletonKeys: string[] = []
): unknown[] {
  if (!record) {
    return [];
  }

  const rows = arrayKeys.flatMap(key => asArray(record[key]));
  singletonKeys.forEach(key => {
    const row = record[key];
    if (asRecord(row)) {
      rows.push(row);
    }
  });

  return rows;
}

function parseSecurityIssueBody(body?: string): Record<string, string> {
  if (!body) {
    return {};
  }

  const fields: Record<string, string> = {};
  const patterns: Array<[string, RegExp]> = [
    ['package', /-\s+\*\*Package:\*\*\s*([^\n]+)/i],
    ['ecosystem', /-\s+\*\*Ecosystem:\*\*\s*([^\n]+)/i],
    ['severity', /-\s+\*\*Severity:\*\*\s*([^\n]+)/i],
    ['currentVersion', /-\s+\*\*Current\/Vulnerable Version:\*\*\s*([^\n]+)/i],
    ['fixedVersion', /-\s+\*\*Patched Version:\*\*\s*([^\n]+)/i],
    ['identifier', /-\s+\*\*Identifier:\*\*\s*([^\n]+)/i],
    ['commitSha', /-\s+\*\*Commit SHA:\*\*\s*([^\n]+)/i],
  ];

  patterns.forEach(([key, pattern]) => {
    const match = body.match(pattern);
    if (match?.[1]) {
      fields[key] = match[1].trim();
    }
  });

  const overview = body.match(/### Overview\s+([\s\S]*?)(?:\n### |\n## |$)/i);
  if (overview?.[1]) {
    fields.overview = overview[1].trim();
  }

  const recommendation = body.match(/### Recommendation\s+([\s\S]*?)(?:\n### |\n## |$)/i);
  if (recommendation?.[1]) {
    fields.recommendation = recommendation[1].trim();
  }

  return fields;
}

function normalizeIdentifier(value?: string): { cve?: string; cwe?: string; identifier?: string } {
  if (!value) {
    return {};
  }

  const identifier = value.trim();
  if (/^CVE-/i.test(identifier)) {
    return { cve: identifier, identifier };
  }
  if (/^CWE-/i.test(identifier)) {
    return { cwe: identifier, identifier };
  }

  return { identifier };
}

function formatSummaryValue(value: unknown): string {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

function pushSummary(
  items: StoredAgentSummaryItem[],
  label: string,
  value: unknown,
  tone: AgentSummaryTone = 'default'
) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  items.push({ label, value: formatSummaryValue(value), tone });
}

function firstRecordArray(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function mergeDefined<T extends Record<string, unknown>>(current: T | undefined, incoming: T): T {
  const merged: Record<string, unknown> = { ...(current ?? {}) };

  for (const [key, value] of Object.entries(incoming)) {
    if (
      value !== undefined &&
      value !== null &&
      value !== '' &&
      (!Array.isArray(value) || value.length > 0)
    ) {
      merged[key] = value;
    }
  }

  return merged as T;
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const rows = new Map<string, T>();

  current.forEach(item => rows.set(item.id, item));
  incoming.forEach(item => {
    const currentItem = rows.get(item.id) as Record<string, unknown> | undefined;
    rows.set(item.id, mergeDefined(currentItem, item as unknown as Record<string, unknown>) as unknown as T);
  });

  return Array.from(rows.values());
}

function normalizeStoredPullRequest(item: unknown): StoredPullRequest | undefined {
  const record = asRecord(item);
  if (!record || !record.id) {
    return undefined;
  }

  return {
    ...(record as unknown as StoredPullRequest),
    reviewers: Array.isArray(record.reviewers) ? record.reviewers.map(String).filter(Boolean) : [],
    labels: Array.isArray(record.labels) ? record.labels.map(String).filter(Boolean) : [],
  };
}

export function readWorkflowMemory(): WorkflowMemory {
  if (!canUseStorage()) {
    return { ...EMPTY_MEMORY };
  }

  try {
    const raw = window.localStorage.getItem(WORKFLOW_MEMORY_KEY);
    if (!raw) {
      return { ...EMPTY_MEMORY };
    }

    const parsed = JSON.parse(raw) as Partial<WorkflowMemory>;

    return {
      agentResults: Array.isArray(parsed.agentResults) ? parsed.agentResults : [],
      vulnerabilities: Array.isArray(parsed.vulnerabilities) ? parsed.vulnerabilities : [],
      pullRequests: Array.isArray(parsed.pullRequests)
        ? parsed.pullRequests.map(normalizeStoredPullRequest).filter((item): item is StoredPullRequest => Boolean(item))
        : [],
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      updatedAt: parsed.updatedAt,
    };
  } catch (error) {
    console.warn('[WorkflowMemory] Failed to read temporary memory', error);
    return { ...EMPTY_MEMORY };
  }
}

export function writeWorkflowMemory(memory: WorkflowMemory) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    WORKFLOW_MEMORY_KEY,
    JSON.stringify({ ...memory, updatedAt: new Date().toISOString() })
  );
}

export function clearWorkflowMemory() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(WORKFLOW_MEMORY_KEY);
}

export function buildAgentSummary(output: unknown): StoredAgentSummaryItem[] {
  const record = normalizeOutputRecord(output);
  if (!record) {
    return [];
  }

  const items: StoredAgentSummaryItem[] = [];
  const vulnerabilities = collectRecordRows(record, ['vulnerabilities', 'findings', 'analysis', 'issues']);
  const pullRequests = collectRecordRows(record, ['pull_requests', 'prs'], ['pull_request', 'pr']);
  const plans = firstRecordArray(record, ['plans', 'remediation_plans']);
  const validation = pickString(record, ['validation']) || pickString(recordAt(record, 'validation') || {}, ['status', 'details']);

  pushSummary(items, 'Vulnerabilities found', record.vulnerabilities_found ?? record.total_vulnerabilities ?? (vulnerabilities.length || undefined), 'danger');
  pushSummary(items, 'Issues created', record.issues_created ?? (firstRecordArray(record, ['issues']).length || undefined), 'info');
  pushSummary(items, 'Critical', record.critical, 'danger');
  pushSummary(items, 'High', record.high, 'warning');
  pushSummary(items, 'Selected', record.high_priority_count ?? record.selected_count, 'info');
  pushSummary(items, 'Plans created', record.plans_created ?? (plans.length || undefined), 'info');
  pushSummary(items, 'PRs created', record.prs_created ?? (pullRequests.length || (record.pr_link ? 1 : undefined)), 'success');
  pushSummary(items, 'Updated', record.updated_count, 'success');
  pushSummary(items, 'Remediated', record.remediated, 'success');
  pushSummary(items, 'Validation', validation, validation === 'passed' ? 'success' : 'default');
  pushSummary(items, 'Verified', record.verified, record.verified === false ? 'danger' : 'success');
  pushSummary(items, 'Checks passed', record.checks_passed, 'success');
  pushSummary(items, 'Checks failed', record.checks_failed, record.checks_failed ? 'danger' : 'success');

  if (vulnerabilities.length > 0 && !items.some(item => item.label === 'Vulnerabilities found')) {
    pushSummary(items, 'Vulnerability rows', vulnerabilities.length, 'danger');
  }

  if (items.length > 0) {
    return items;
  }

  return Object.entries(record)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .slice(0, 4)
    .map(([key, value]) => ({
      label: key.replace(/_/g, ' '),
      value: formatSummaryValue(value),
    }));
}

export function extractVulnerabilities(output: unknown, context: AgentResultContext = {}): StoredVulnerability[] {
  const record = normalizeOutputRecord(output);
  const rows = record
    ? collectRecordRows(record, ['vulnerabilities', 'findings', 'analysis', 'issues'])
    : asArray(output);

  return rows
    .map((row, index): StoredVulnerability | undefined => {
      const item = asRecord(row);
      if (!item) {
        return undefined;
      }

      const parsedIssue = parseSecurityIssueBody(pickString(item, ['body']));
      const packageName = pickString(item, ['package', 'package_name', 'dependency']) || parsedIssue.package;
      const rawIdentifier =
        pickString(item, ['identifier', 'cve', 'cve_id']) ||
        pickStringFromUnknown(item.cve_ids) ||
        parsedIssue.identifier;
      const rawCwe =
        pickString(item, ['cwe', 'cwe_id']) ||
        pickStringFromUnknown(item.cwe_ids);
      const normalizedIdentifier = normalizeIdentifier(rawIdentifier);
      const normalizedCwe = normalizeIdentifier(rawCwe);
      const cve = normalizedIdentifier.cve;
      const cwe = normalizedCwe.cwe || normalizedIdentifier.cwe;
      const identifier = cve || cwe || normalizedIdentifier.identifier || normalizedCwe.identifier;
      const repository = getRepositoryDetails(item, context);
      const id =
        pickString(item, ['vulnerability_id', 'normalized_id']) ||
        (context.agent === 'github_issue_agent' || pickString(item, ['html_url'])
          ? [repository.repositoryName || repository.repositoryUrl, packageName, identifier].filter(Boolean).join(':')
          : pickString(item, ['id'])) ||
        [repository.repositoryName || repository.repositoryUrl, packageName, identifier].filter(Boolean).join(':') ||
        `${context.workflowId || 'workflow'}-${context.agent || 'agent'}-vuln-${index + 1}`;
      const title =
        pickString(item, ['title', 'name']) ||
        (packageName && identifier ? `${packageName} vulnerability (${identifier})` : undefined) ||
        identifier ||
        pickString(item, ['description']) ||
        id;
      const prUrl = pickString(item, ['pr_url', 'pull_request_url']);
      const issueUrl = pickString(item, ['html_url', 'issue_url', 'url']);

      return {
        id,
        title,
        severity: pickString(item, ['severity']) || parsedIssue.severity,
        status: pickString(item, ['status', 'state']),
        cve,
        cwe,
        ecosystem: pickString(item, ['ecosystem']) || parsedIssue.ecosystem,
        cvssScore: pickNumber(item, ['cvss_score', 'cvss']),
        repositoryId: repository.repositoryId,
        repositoryName: repository.repositoryName,
        repositoryUrl: repository.repositoryUrl,
        packageName,
        affectedComponent: pickString(item, ['affected_component', 'component']),
        currentVersion: pickString(item, ['current_version', 'affected_version']) || parsedIssue.currentVersion,
        vulnerableVersion: pickString(item, ['vulnerable_version', 'vulnerable_range']),
        filePath: pickString(item, ['file_path', 'path']),
        fixedVersion: pickString(item, ['fixed_version', 'patched_version', 'patched_versions', 'recommended_version']) || parsedIssue.fixedVersion,
        overview: pickString(item, ['overview', 'explanation', 'description']) || parsedIssue.overview,
        recommendation: pickString(item, ['recommendation', 'fix_strategy']) || parsedIssue.recommendation,
        issueNumber: pickNumber(item, ['number']),
        issueUrl,
        remediationJobId: pickString(item, ['remediation_job_id', 'job_id']),
        prId: pickString(item, ['pr_id', 'pull_request_id']),
        prUrl,
        workflowId: context.workflowId,
        sourceAgent: context.agent,
        updatedAt: pickString(item, ['updated_at']) || context.timestamp,
      };
    })
    .filter((item): item is StoredVulnerability => Boolean(item));
}

export function extractPullRequests(output: unknown, context: AgentResultContext = {}): StoredPullRequest[] {
  const record = normalizeOutputRecord(output);
  const rows = record
    ? [
        ...collectRecordRows(record, ['pull_requests', 'prs'], ['pull_request', 'pr']),
        ...(
          pickString(record, ['pr_link'])
            ? [{
                html_url: pickString(record, ['pr_link']),
                title: 'Automated security remediation PR',
                status: 'open',
              }]
            : []
        ),
      ]
    : asArray(output);

  return rows
    .map((row, index): StoredPullRequest | undefined => {
      const item = asRecord(row);
      if (!item) {
        return undefined;
      }

      const number = pickNumber(item, ['pr_number', 'number']);
      const repository = getRepositoryDetails(item, context);
      const id =
        pickString(item, ['pr_id', 'external_id', 'id']) ||
        (number ? `${repository.repositoryName || repository.repositoryUrl || 'repo'}-pr-${number}` : undefined) ||
        `${context.workflowId || 'workflow'}-${context.agent || 'agent'}-pr-${index + 1}`;

      return {
        id,
        number,
        title: pickString(item, ['title', 'name']) || id,
        description: pickString(item, ['description', 'body']),
        url: pickString(item, ['html_url', 'url']),
        status: pickString(item, ['status', 'state']),
        repositoryId: repository.repositoryId,
        repositoryName: repository.repositoryName,
        repositoryUrl: repository.repositoryUrl,
        branch: pickString(item, ['branch', 'source_branch', 'head_branch']) || getNestedString(item, [['head', 'ref']]),
        baseBranch: pickString(item, ['base_branch', 'target_branch']) || getNestedString(item, [['base', 'ref']]) || context.branch,
        commitSha: getNestedString(item, [['head', 'sha']]) || pickString(item, ['commit_sha', 'merge_commit_sha']),
        changedFiles: pickNumber(item, ['changed_files', 'files_changed']),
        additions: pickNumber(item, ['additions']),
        deletions: pickNumber(item, ['deletions']),
        vulnerabilityId: pickString(item, ['vulnerability_id']),
        workflowId: context.workflowId,
        reviewers: pickStringArray(item, ['reviewers', 'requested_reviewers']),
        labels: pickStringArray(item, 'labels'),
        createdAt: pickString(item, ['created_at']) || context.timestamp,
        sourceAgent: context.agent,
      };
    })
    .filter((item): item is StoredPullRequest => Boolean(item));
}

export function extractRemediationPlans(output: unknown, context: AgentResultContext = {}): StoredRemediationPlan[] {
  const record = normalizeOutputRecord(output);
  const rows = record ? firstRecordArray(record, ['plans', 'remediation_plans']) : asArray(output);

  return rows
    .map((row, index): StoredRemediationPlan | undefined => {
      const item = asRecord(row);
      if (!item) {
        return undefined;
      }

      const id =
        pickString(item, ['plan_id', 'id']) ||
        `${context.workflowId || 'workflow'}-${context.agent || 'agent'}-plan-${index + 1}`;

      return {
        id,
        vulnerabilityId: pickString(item, ['vulnerability_id']),
        strategy: pickString(item, ['strategy', 'fix_strategy']),
        status: pickString(item, ['status']),
        summary: pickString(item, ['summary', 'description', 'recommendation']),
        agent: context.agent,
        workflowId: context.workflowId,
        confidence: pickNumber(item, ['confidence', 'confidence_score']),
        estimatedEffort: pickString(item, ['estimated_effort', 'effort']),
      };
    })
    .filter((item): item is StoredRemediationPlan => Boolean(item));
}

function pullRequestsToVulnerabilityLinks(
  pullRequests: StoredPullRequest[],
  context: AgentResultContext
): StoredVulnerability[] {
  return pullRequests
    .filter(pr => Boolean(pr.vulnerabilityId))
    .map(pr => ({
      id: pr.vulnerabilityId as string,
      title: pr.vulnerabilityId as string,
      status: pr.status,
      repositoryId: pr.repositoryId,
      repositoryName: pr.repositoryName,
      repositoryUrl: pr.repositoryUrl,
      prId: pr.id,
      prUrl: pr.url,
      workflowId: context.workflowId,
      sourceAgent: context.agent,
      updatedAt: pr.createdAt || context.timestamp,
    }));
}

export function mergeStoredVulnerabilities(
  base: StoredVulnerability[],
  incoming: StoredVulnerability[]
): StoredVulnerability[] {
  return mergeById(base, incoming);
}

export function mergeStoredPullRequests(
  base: StoredPullRequest[],
  incoming: StoredPullRequest[]
): StoredPullRequest[] {
  return mergeById(base, incoming)
    .map(normalizeStoredPullRequest)
    .filter((item): item is StoredPullRequest => Boolean(item));
}

export function rememberAgentResult(input: RememberAgentResultInput) {
  const output = normalizeOutputRecord(input.output) ?? {};
  const timestamp = input.timestamp || new Date().toISOString();
  const context: AgentResultContext = {
    workflowId: input.workflowId,
    agent: input.agent,
    stepName: input.stepName,
    timestamp,
    repoUrl: input.repoUrl,
    branch: input.branch,
    repositoryName: input.repositoryName,
  };

  const memory = readWorkflowMemory();
  const result: StoredAgentResult = {
    id: `${input.workflowId}:${input.agent}:${input.stepName}:${timestamp}`,
    workflowId: input.workflowId,
    agent: input.agent,
    stepName: input.stepName,
    status: input.status,
    timestamp,
    summary: buildAgentSummary(output),
    output,
  };

  const vulnerabilities = extractVulnerabilities(output, context);
  const pullRequests = extractPullRequests(output, context);
  const plans = extractRemediationPlans(output, context);

  const nextMemory: WorkflowMemory = {
    agentResults: [result, ...memory.agentResults.filter(item => item.id !== result.id)].slice(0, 200),
    vulnerabilities: mergeStoredVulnerabilities(
      memory.vulnerabilities,
      [...vulnerabilities, ...pullRequestsToVulnerabilityLinks(pullRequests, context)]
    ).slice(0, 500),
    pullRequests: mergeStoredPullRequests(memory.pullRequests, pullRequests).slice(0, 200),
    plans: mergeById(memory.plans, plans).slice(0, 200),
    updatedAt: timestamp,
  };

  writeWorkflowMemory(nextMemory);
}
