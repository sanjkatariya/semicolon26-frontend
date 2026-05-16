# Mock Data - Agentic Orchestrator

Complete end-to-end mock data for the entire vulnerability remediation workflow.

## 📁 Files Overview

### 1. vulnerabilities.json
**Purpose**: Sample vulnerabilities detected by various scanners

**Contents**:
- 5 vulnerabilities with different severities (Critical, High, Medium)
- Multiple scanner sources (Trivy, Snyk, Checkov, Semgrep, SonarQube)
- Different vulnerability types (SQL Injection, Prototype Pollution, XSS, Hardcoded Credentials, K8s Misconfig)
- Complete vulnerability metadata (CVE, CWE, CVSS scores, affected files)

**Use Cases**:
- Testing vulnerability detection UI
- Testing vulnerability filtering and search
- Testing severity-based prioritization
- Testing scanner integration

### 2. agents.json
**Purpose**: Registered agents (scanners and remediation tools)

**Contents**:
- 8 agents (5 scanners, 3 remediation agents)
- Scanner agents: Trivy, Snyk, Checkov, Semgrep, SonarQube
- Remediation agents: Dependency Fixer, Code Patcher AI, Infrastructure Fixer
- Agent capabilities, configurations, health status
- Execution statistics and performance metrics

**Use Cases**:
- Testing agent registry UI
- Testing agent health monitoring
- Testing agent capability discovery
- Testing agent execution tracking

### 3. remediation-workflow.json
**Purpose**: Complete workflow execution from vulnerability detection to PR creation

**Contents**:
- Full workflow run with 11 steps
- Step-by-step execution details
- Input/output for each step
- Timing and duration metrics
- Parallel execution example
- Human approval gate
- Verification and notification steps

**Workflow Steps**:
1. Vulnerability Scan (Trivy)
2. Normalize Vulnerabilities
3. Prioritize Vulnerabilities
4. Create Remediation Plans
5. Approval Gate (Human)
6. Execute Remediation (Parallel)
   - Fix SQL Injection (Code Patcher AI)
   - Upgrade Lodash (Dependency Fixer)
7. Create Pull Requests
8. Run Verification
9. Notify Stakeholders
10. Update Vulnerability Status
11. Create Audit Log

**Use Cases**:
- Testing workflow builder UI
- Testing workflow execution visualization
- Testing step-by-step progress tracking
- Testing parallel execution
- Testing approval workflows

### 4. pull-requests.json
**Purpose**: Automated pull requests created by remediation agents

**Contents**:
- 2 detailed pull requests
- PR #1234: SQL Injection fix with code changes
- PR #2235: Lodash dependency upgrade
- Complete PR descriptions with security details
- Review status and comments
- CI/CD check results
- File changes and diff statistics

**PR Features**:
- Comprehensive security analysis
- Testing results
- Impact assessment
- Deployment plan
- Rollback plan
- Automated labels and reviewers

**Use Cases**:
- Testing PR review UI
- Testing PR status tracking
- Testing CI/CD integration
- Testing merge readiness checks

### 5. events.json
**Purpose**: Event stream showing the entire remediation process

**Contents**:
- 15 events across the workflow lifecycle
- Event types: vulnerability, remediation, agent, PR, workflow, deployment, notification, compliance, policy
- Correlation IDs for tracing
- Event metadata and priorities

**Event Timeline**:
1. vulnerability.detected
2. vulnerability.normalized
3. remediation.plan.created
4. remediation.plan.approved
5. agent.execution.started
6. agent.execution.completed
7. pr.created
8. workflow.step.completed
9. deployment.verification.started
10. deployment.verification.completed
11. notification.sent
12. workflow.completed
13. agent.heartbeat
14. compliance.violation.detected
15. policy.violation

**Use Cases**:
- Testing event stream UI
- Testing real-time updates
- Testing event correlation
- Testing audit trail
- Testing compliance monitoring

---

## 🔄 End-to-End Flow

### Complete Remediation Journey

```
1. DETECTION (14:30:00)
   └─ Trivy scans repository
   └─ Finds 5 vulnerabilities
   └─ Event: vulnerability.detected

2. NORMALIZATION (14:30:15)
   └─ Normalize vulnerability data
   └─ Deduplicate findings
   └─ Enrich with CVE data
   └─ Event: vulnerability.normalized

3. PRIORITIZATION (14:30:20)
   └─ Filter by severity (Critical, High)
   └─ Check exploitability
   └─ Verify fix availability
   └─ Select 2 high-priority vulns

4. PLANNING (14:30:22)
   └─ Create remediation plans
   └─ Plan 1: Code fix for SQL injection
   └─ Plan 2: Dependency upgrade for Lodash
   └─ Event: remediation.plan.created

5. APPROVAL (14:30:30 - 14:32:00)
   └─ Human approval gate
   └─ Security team reviews plans
   └─ Approved by john.doe@company.com
   └─ Event: remediation.plan.approved

6. EXECUTION (14:32:00 - 14:32:45)
   └─ Parallel execution of fixes
   
   6a. SQL Injection Fix (45 seconds)
       └─ Agent: Code Patcher AI
       └─ Replace string concatenation
       └─ Add parameterized queries
       └─ Create branch: fix/sql-injection-vuln-001
       └─ Event: agent.execution.completed
   
   6b. Lodash Upgrade (30 seconds)
       └─ Agent: Dependency Fixer
       └─ Upgrade 4.17.20 → 4.17.21
       └─ Update package.json
       └─ Create branch: fix/lodash-upgrade-vuln-002
       └─ Event: agent.execution.completed

7. PR CREATION (14:32:45 - 14:33:30)
   └─ Create PR #1234 for SQL injection
   └─ Create PR #1235 for Lodash upgrade
   └─ Add detailed descriptions
   └─ Assign reviewers
   └─ Add labels
   └─ Event: pr.created

8. VERIFICATION (14:33:30 - 14:38:30)
   └─ Run CI/CD pipeline
   └─ Unit tests: ✅ Pass
   └─ Integration tests: ✅ Pass
   └─ Security scans: ✅ Clean
   └─ Code quality: ✅ A+
   └─ Build: ✅ Success
   └─ Event: deployment.verification.completed

9. NOTIFICATION (14:38:30)
   └─ Send Slack notification
   └─ Send email to teams
   └─ 15 recipients notified
   └─ Event: notification.sent

10. COMPLETION (14:45:30)
    └─ Update vulnerability status
    └─ Create audit log
    └─ Workflow completed
    └─ Event: workflow.completed

Total Duration: 15.5 minutes
Automation Rate: 100%
Success Rate: 100%
```

---

## 📊 Data Statistics

### Vulnerabilities
- **Total**: 5
- **Critical**: 2 (SQL Injection, Hardcoded Credentials)
- **High**: 2 (Prototype Pollution, XSS)
- **Medium**: 1 (K8s Misconfiguration)
- **Scanners**: 5 different sources

### Agents
- **Total**: 8
- **Scanners**: 5 (Trivy, Snyk, Checkov, Semgrep, SonarQube)
- **Remediation**: 3 (Dependency Fixer, Code Patcher AI, Infrastructure Fixer)
- **Health**: 100% healthy
- **Total Executions**: 3,734

### Workflow
- **Steps**: 11
- **Duration**: 15.5 minutes
- **Success Rate**: 100%
- **Parallel Steps**: 2
- **Human Approvals**: 1

### Pull Requests
- **Created**: 2
- **Files Changed**: 5
- **Additions**: 26 lines
- **Deletions**: 9 lines
- **Reviews**: 3 approvals
- **CI Checks**: 15 passed

### Events
- **Total**: 15
- **High Priority**: 7
- **Medium Priority**: 5
- **Low Priority**: 3
- **Correlation IDs**: 4

---

## 🎯 Use Cases

### Frontend Development
```javascript
// Load vulnerabilities
import vulnerabilities from './mock-data/vulnerabilities.json';

// Display in UI
<VulnerabilityList data={vulnerabilities.vulnerabilities} />
```

### Testing Workflows
```javascript
// Load workflow execution
import workflow from './mock-data/remediation-workflow.json';

// Visualize workflow steps
<WorkflowTimeline steps={workflow.workflow_execution.steps} />
```

### Event Stream Simulation
```javascript
// Load events
import events from './mock-data/events.json';

// Simulate real-time stream
events.events.forEach((event, index) => {
  setTimeout(() => {
    eventBus.emit(event.event_type, event);
  }, index * 1000);
});
```

### Agent Monitoring
```javascript
// Load agents
import agents from './mock-data/agents.json';

// Display agent health
<AgentHealthDashboard agents={agents.agents} />
```

### PR Review Interface
```javascript
// Load pull requests
import prs from './mock-data/pull-requests.json';

// Display PR details
<PRReviewPanel pullRequest={prs.pull_requests[0]} />
```

---

## 🔧 Integration Examples

### API Mock Server
```javascript
// Express.js mock server
const express = require('express');
const app = express();

const vulnerabilities = require('./mock-data/vulnerabilities.json');
const agents = require('./mock-data/agents.json');
const workflow = require('./mock-data/remediation-workflow.json');
const prs = require('./mock-data/pull-requests.json');
const events = require('./mock-data/events.json');

app.get('/api/v1/vulnerabilities', (req, res) => {
  res.json(vulnerabilities);
});

app.get('/api/v1/agents', (req, res) => {
  res.json(agents);
});

app.get('/api/v1/workflows/runs/:id', (req, res) => {
  res.json(workflow);
});

app.get('/api/v1/pull-requests', (req, res) => {
  res.json(prs);
});

app.get('/api/v1/events', (req, res) => {
  res.json(events);
});

app.listen(3001, () => {
  console.log('Mock API server running on port 3001');
});
```

### WebSocket Event Stream
```javascript
// Socket.IO server
const io = require('socket.io')(3002);
const events = require('./mock-data/events.json');

io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Stream events with delay
  events.events.forEach((event, index) => {
    setTimeout(() => {
      socket.emit('event', event);
    }, index * 2000);
  });
});
```

### React Query Integration
```typescript
// React Query hooks
import { useQuery } from '@tanstack/react-query';
import vulnerabilities from './mock-data/vulnerabilities.json';

export function useVulnerabilities() {
  return useQuery({
    queryKey: ['vulnerabilities'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return vulnerabilities;
    }
  });
}
```

---

## 📝 Data Relationships

```
Vulnerability (vuln-001)
    ↓
Remediation Plan (plan-001)
    ↓
Agent Execution (exec-001)
    ↓
Pull Request (pr-001)
    ↓
Workflow Run (workflow-run-001)
    ↓
Events (evt-001 → evt-012)
```

---

## 🎨 UI Component Examples

### Vulnerability Card
```tsx
import { vulnerabilities } from './mock-data/vulnerabilities.json';

<VulnerabilityCard 
  vulnerability={vulnerabilities[0]}
  onRemediate={() => {}}
/>
```

### Workflow Timeline
```tsx
import { workflow_execution } from './mock-data/remediation-workflow.json';

<WorkflowTimeline 
  steps={workflow_execution.steps}
  status={workflow_execution.status}
/>
```

### Agent Health Grid
```tsx
import { agents } from './mock-data/agents.json';

<AgentHealthGrid 
  agents={agents}
  onAgentClick={(agent) => {}}
/>
```

### PR Review Panel
```tsx
import { pull_requests } from './mock-data/pull-requests.json';

<PRReviewPanel 
  pullRequest={pull_requests[0]}
  onApprove={() => {}}
  onReject={() => {}}
/>
```

### Event Stream
```tsx
import { events } from './mock-data/events.json';

<EventStream 
  events={events}
  filter={{ priority: 'high' }}
/>
```

---

## 🚀 Quick Start

### 1. Load All Mock Data
```javascript
import vulnerabilities from './mock-data/vulnerabilities.json';
import agents from './mock-data/agents.json';
import workflow from './mock-data/remediation-workflow.json';
import pullRequests from './mock-data/pull-requests.json';
import events from './mock-data/events.json';

console.log('Vulnerabilities:', vulnerabilities.summary);
console.log('Agents:', agents.summary);
console.log('Workflow:', workflow.workflow_execution.summary);
console.log('PRs:', pullRequests.summary);
console.log('Events:', events.event_stream_summary);
```

### 2. Filter Data
```javascript
// Get critical vulnerabilities
const critical = vulnerabilities.vulnerabilities.filter(
  v => v.severity === 'critical'
);

// Get active agents
const activeAgents = agents.agents.filter(
  a => a.status === 'active'
);

// Get high priority events
const highPriorityEvents = events.events.filter(
  e => e.metadata.priority === 'high'
);
```

### 3. Simulate Workflow
```javascript
// Simulate workflow execution
async function simulateWorkflow() {
  for (const step of workflow.workflow_execution.steps) {
    console.log(`Executing: ${step.step_name}`);
    await new Promise(resolve => 
      setTimeout(resolve, step.duration_ms)
    );
    console.log(`Completed: ${step.step_name}`);
  }
}
```

---

## 📚 Additional Resources

- **Architecture**: See `docs/architecture/SYSTEM_ARCHITECTURE.md`
- **API Reference**: See `docs/api/README.md`
- **Frontend Guide**: See `frontend/README.md`
- **Getting Started**: See `GETTING_STARTED.md`

---

**Last Updated**: 2026-05-13
**Version**: 1.0.0
**Status**: Complete ✅