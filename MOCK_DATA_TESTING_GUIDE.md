# 🧪 Mock Data Testing Guide - Complete End-to-End Flow

Yeh guide aapko step-by-step dikhayega ki **Agentic Orchestrator** kaise kaam karta hai using mock data.

---

## 📋 Quick Navigation

1. [System Overview](#-system-overview)
2. [Complete Workflow](#-complete-workflow-155-minutes)
3. [Agent Registration](#-step-1-agent-registration)
4. [Vulnerability Detection](#-step-2-vulnerability-detection)
5. [Remediation Process](#-step-3-remediation-process)
6. [Pull Request Creation](#-step-4-pull-request-creation)
7. [Event Flow](#-step-5-event-flow)
8. [Dashboard Metrics](#-step-6-dashboard-metrics)
9. [Testing Instructions](#-testing-instructions)

---

## 🎯 System Overview

### Agentic Orchestrator Kya Hai?

**Agentic Orchestrator** ek AI-powered security platform hai jo:
- ✅ Automatically vulnerabilities detect karta hai
- ✅ AI se fix generate karta hai
- ✅ Pull requests automatically create karta hai
- ✅ Deployment verify karta hai
- ✅ Compliance track karta hai

### Architecture Flow

```
Agent Registration → Vulnerability Scan → Prioritization → 
AI Fix Generation → Code Patch → Testing → Pull Request → 
Review → Merge → Deployment → Verification
```

---

## ⏱️ Complete Workflow (15.5 Minutes)

### Timeline Overview

```
00:00 - Workflow Started
00:30 - Agent Health Check ✅
01:00 - Repository Scan Started
03:30 - Vulnerabilities Detected (5 found)
04:00 - Vulnerability Normalization
05:00 - Risk Prioritization
06:00 - Remediation Planning
08:00 - AI Fix Generation
10:00 - Code Patch Created
11:30 - Tests Executed ✅
12:00 - Pull Request Created
13:00 - Review Requested
14:30 - Deployment Verification
15:30 - Workflow Completed ✅
```

---

## 🤖 Step 1: Agent Registration

### Mock Data Location
```
mock-data/agents.json
```

### Total Agents: 8

#### Scanner Agents (5)

**1. Trivy - Container Security Scanner**
```json
{
  "id": "agent-trivy-001",
  "name": "Trivy Scanner",
  "type": "scanner",
  "category": "container_security",
  "status": "active",
  "health": "healthy",
  "capabilities": [
    "container_scanning",
    "image_scanning",
    "vulnerability_detection"
  ],
  "version": "0.48.0"
}
```

**Kya Karta Hai:**
- Docker images scan karta hai
- Container vulnerabilities detect karta hai
- Misconfigurations find karta hai

**2. Snyk - Dependency Scanner**
```json
{
  "id": "agent-snyk-001",
  "name": "Snyk Dependency Scanner",
  "type": "scanner",
  "category": "dependency_security",
  "supported_languages": ["javascript", "python", "java", "go"]
}
```

**Kya Karta Hai:**
- npm, pip, maven dependencies scan karta hai
- Outdated packages detect karta hai
- License issues find karta hai

**3. Checkov - IaC Scanner**
```json
{
  "id": "agent-checkov-001",
  "name": "Checkov IaC Scanner",
  "type": "scanner",
  "category": "infrastructure_security",
  "supported_languages": ["terraform", "cloudformation", "kubernetes"]
}
```

**Kya Karta Hai:**
- Terraform files scan karta hai
- Cloud misconfigurations detect karta hai
- Security best practices check karta hai

**4. Semgrep - Code Scanner**
```json
{
  "id": "agent-semgrep-001",
  "name": "Semgrep Code Scanner",
  "type": "scanner",
  "category": "code_security"
}
```

**Kya Karta Hai:**
- Source code scan karta hai
- SQL injection, XSS detect karta hai
- Custom security rules apply karta hai

**5. SonarQube - Code Quality**
```json
{
  "id": "agent-sonarqube-001",
  "name": "SonarQube Scanner",
  "type": "scanner",
  "category": "code_quality"
}
```

**Kya Karta Hai:**
- Code quality check karta hai
- Security hotspots find karta hai
- Technical debt calculate karta hai

#### Remediation Agents (3)

**6. Dependency Remediation Agent**
```json
{
  "id": "agent-dep-remediation-001",
  "name": "Dependency Remediation Agent",
  "type": "remediation",
  "capabilities": [
    "dependency_updates",
    "version_bumping",
    "automated_testing"
  ]
}
```

**Kya Karta Hai:**
- Dependencies automatically update karta hai
- package.json, requirements.txt modify karta hai
- Compatibility test karta hai

**7. Infrastructure Remediation Agent**
```json
{
  "id": "agent-infra-remediation-001",
  "name": "Infrastructure Remediation Agent",
  "type": "remediation"
}
```

**Kya Karta Hai:**
- Terraform files fix karta hai
- Kubernetes configs update karta hai
- Security policies enforce karta hai

**8. AI Code Patching Agent**
```json
{
  "id": "agent-ai-patch-001",
  "name": "AI Code Patching Agent",
  "type": "remediation",
  "capabilities": [
    "ai_code_generation",
    "vulnerability_patching",
    "security_hardening"
  ]
}
```

**Kya Karta Hai:**
- AI se code fix generate karta hai
- Vulnerabilities patch karta hai
- Security best practices apply karta hai

### Agent Communication Flow

```
┌──────────────────────────────────────────────────────────┐
│  1. AGENT REGISTRATION                                    │
│                                                           │
│  Agent → API Gateway → Agent Registry → PostgreSQL       │
│                                                           │
│  POST /api/v1/agents/register                            │
│  {                                                        │
│    "name": "Trivy Scanner",                              │
│    "type": "scanner",                                    │
│    "capabilities": ["container_scanning"]                │
│  }                                                        │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  2. EVENT PUBLISHED                                       │
│                                                           │
│  Kafka Topic: agent.registered                           │
│  {                                                        │
│    "event": "agent.registered",                          │
│    "agent_id": "agent-trivy-001",                        │
│    "timestamp": "2024-01-15T10:00:00Z"                   │
│  }                                                        │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  3. AGENT ACTIVATED                                       │
│                                                           │
│  Agent Runtime Service:                                   │
│  - Health checks started (every 30s)                     │
│  - Heartbeat monitoring                                  │
│  - Ready to receive tasks                                │
└──────────────────────────────────────────────────────────┘
```

### Testing Agent Registration

**Frontend UI:**
```
http://localhost:3000/agents
```

**Expected Display:**
- 8 agents listed
- 5 scanner agents (green status)
- 3 remediation agents (green status)
- Health: All "healthy"
- Last heartbeat: Recent timestamps

---

## 🔍 Step 2: Vulnerability Detection

### Mock Data Location
```
mock-data/vulnerabilities.json
```

### Total Vulnerabilities: 5

#### Critical (1)

**CVE-2023-12345 - SQL Injection**
```json
{
  "id": "vuln-001",
  "title": "SQL Injection in User Authentication",
  "severity": "critical",
  "cvss_score": 9.8,
  "cve_ids": ["CVE-2023-12345"],
  "detected_by": "agent-semgrep-001",
  "affected_component": {
    "file_path": "src/auth/login.py",
    "line_number": 45
  }
}
```

**Impact:**
- Attacker authentication bypass kar sakta hai
- Database compromise ho sakta hai
- Data exfiltration possible hai

**Vulnerable Code:**
```python
# VULNERABLE
def authenticate_user(username, password):
    query = f"SELECT * FROM users WHERE username='{username}'"
    # String concatenation - SQL Injection risk!
```

#### High (2)

**CVE-2023-23456 - Outdated Dependency**
```json
{
  "id": "vuln-002",
  "title": "Outdated lodash version with prototype pollution",
  "severity": "high",
  "cvss_score": 7.5,
  "detected_by": "agent-snyk-001",
  "affected_component": {
    "package_name": "lodash",
    "current_version": "4.17.15",
    "fixed_version": "4.17.21"
  }
}
```

**CVE-2023-34567 - Exposed Secrets**
```json
{
  "id": "vuln-003",
  "title": "AWS credentials hardcoded in configuration",
  "severity": "high",
  "cvss_score": 8.2,
  "detected_by": "agent-trivy-001"
}
```

#### Medium (2)

**CVE-2023-45678 - Terraform Misconfiguration**
```json
{
  "id": "vuln-004",
  "title": "S3 bucket without encryption",
  "severity": "medium",
  "cvss_score": 5.3,
  "detected_by": "agent-checkov-001"
}
```

**CVE-2023-56789 - Code Quality Issue**
```json
{
  "id": "vuln-005",
  "title": "Insecure random number generation",
  "severity": "medium",
  "cvss_score": 4.8,
  "detected_by": "agent-sonarqube-001"
}
```

### Vulnerability Detection Flow

```
┌──────────────────────────────────────────────────────────┐
│  1. SCAN TRIGGERED                                        │
│                                                           │
│  Workflow Orchestrator → Agent Runtime                   │
│  "Scan repository: github.com/company/api-service"       │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  2. AGENTS EXECUTE SCAN                                   │
│                                                           │
│  Trivy:    Container images scan → 1 vuln found          │
│  Snyk:     Dependencies scan → 1 vuln found              │
│  Semgrep:  Code scan → 1 vuln found                      │
│  Checkov:  IaC scan → 1 vuln found                       │
│  SonarQube: Quality scan → 1 vuln found                  │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  3. VULNERABILITY AGGREGATION                             │
│                                                           │
│  Vulnerability Aggregation Service:                       │
│  - Collect results from all agents                       │
│  - Deduplicate findings                                  │
│  - Enrich with metadata                                  │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  4. NORMALIZATION                                         │
│                                                           │
│  Vulnerability Normalization Service:                     │
│  - Standardize format                                    │
│  - Calculate CVSS scores                                 │
│  - Map to CVE/CWE                                        │
│  - Add exploitability data                               │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  5. STORAGE & EVENT                                       │
│                                                           │
│  PostgreSQL: Store in vulnerability_db                   │
│  Kafka: Publish "vulnerability.detected" event           │
└──────────────────────────────────────────────────────────┘
```

### Testing Vulnerability Detection

**Frontend UI:**
```
http://localhost:3000/vulnerabilities
```

**Expected Display:**
- 5 vulnerabilities listed
- Severity badges (Critical: red, High: orange, Medium: yellow)
- CVE IDs clickable
- Agent that detected it
- File path and line number
- Remediation status

---

## 🔧 Step 3: Remediation Process

### Mock Data Location
```
mock-data/remediation-workflow.json
```

### Workflow Steps (11 Total)

#### Step 1: Workflow Initialization (0:00 - 0:30)

**Input:**
```json
{
  "trigger": "scheduled_scan",
  "repository": "github.com/company/api-service",
  "branch": "main"
}
```

**Output:**
```json
{
  "workflow_id": "wf-20240115-001",
  "agents_selected": ["agent-trivy-001", "agent-snyk-001", "agent-semgrep-001"]
}
```

#### Step 2: Agent Health Check (0:30 - 1:00)

**Output:**
```json
{
  "healthy_agents": 8,
  "unhealthy_agents": 0,
  "agents_ready": true
}
```

#### Step 3: Repository Scan (1:00 - 3:30)

**Output:**
```json
{
  "files_scanned": 247,
  "vulnerabilities_found": 5,
  "scan_duration": "2m 30s"
}
```

#### Step 4: Vulnerability Normalization (3:30 - 4:00)

**Output:**
```json
{
  "vulnerabilities_normalized": 5,
  "duplicates_removed": 2,
  "cvss_scores_calculated": 5
}
```

#### Step 5: Risk Prioritization (4:00 - 5:00)

**Output:**
```json
{
  "critical": 1,
  "high": 2,
  "medium": 2,
  "priority_queue": ["vuln-001", "vuln-002", "vuln-003"]
}
```

**Prioritization Logic:**
- CVSS score > 9.0 → Critical (immediate fix)
- CVSS score 7.0-8.9 → High (fix within 24h)
- CVSS score 4.0-6.9 → Medium (fix within 7 days)

#### Step 6: Remediation Planning (5:00 - 6:00)

**Output:**
```json
{
  "remediation_strategies": [
    {
      "vulnerability_id": "vuln-001",
      "strategy": "code_patch",
      "agent": "agent-ai-patch-001",
      "estimated_effort": "medium"
    },
    {
      "vulnerability_id": "vuln-002",
      "strategy": "dependency_update",
      "agent": "agent-dep-remediation-001",
      "estimated_effort": "low"
    }
  ]
}
```

#### Step 7: AI Fix Generation (6:00 - 8:00)

**Input:**
```json
{
  "vulnerability_id": "vuln-001",
  "file": "src/auth/login.py",
  "vulnerability_type": "sql_injection"
}
```

**Output:**
```json
{
  "fix_generated": true,
  "fix_type": "parameterized_query",
  "confidence_score": 0.95,
  "code_changes": {
    "files_modified": 1,
    "lines_added": 3,
    "lines_removed": 1
  }
}
```

**Generated Fix:**
```python
# BEFORE (Vulnerable)
def authenticate_user(username, password):
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    result = db.execute(query)
    return result

# AFTER (Fixed)
def authenticate_user(username, password):
    query = "SELECT * FROM users WHERE username=? AND password=?"
    result = db.execute(query, (username, password))
    return result
```

#### Step 8: Code Patch Creation (8:00 - 10:00)

**Output:**
```json
{
  "patch_created": true,
  "branch_name": "fix/sql-injection-vuln-001",
  "commit_hash": "a1b2c3d4e5f6",
  "files_changed": ["src/auth/login.py", "tests/test_auth.py"]
}
```

#### Step 9: Automated Testing (10:00 - 11:30)

**Output:**
```json
{
  "tests_run": 45,
  "tests_passed": 45,
  "tests_failed": 0,
  "code_coverage": "94%",
  "security_tests_passed": true
}
```

#### Step 10: Pull Request Creation (11:30 - 12:00)

**Output:**
```json
{
  "pr_created": true,
  "pr_number": 1234,
  "pr_url": "https://github.com/company/api-service/pull/1234",
  "reviewers_assigned": ["security-team", "backend-team"]
}
```

#### Step 11: Deployment Verification (12:00 - 15:30)

**Output:**
```json
{
  "pr_merged": true,
  "deployment_status": "success",
  "vulnerability_status": "resolved",
  "verification_passed": true
}
```

### Testing Remediation Process

**Frontend UI:**
```
http://localhost:3000/remediation
```

**Expected Display:**
- Workflow timeline (15.5 minutes)
- 11 steps with status
- Each step's input/output
- Progress bar
- Real-time updates

---

## 📝 Step 4: Pull Request Creation

### Mock Data Location
```
mock-data/pull-requests.json
```

### PR #1234 - SQL Injection Fix

```json
{
  "pr_number": 1234,
  "title": "🔒 Security Fix: SQL Injection in User Authentication (CVE-2023-12345)",
  "state": "open",
  "author": "agentic-orchestrator[bot]",
  "reviewers": ["security-team", "backend-team"],
  "labels": ["security", "critical", "auto-remediation"],
  "files_changed": 2,
  "additions": 15,
  "deletions": 5
}
```

**PR Description:**
```markdown
## 🔒 Security Vulnerability Fix

### Vulnerability Details
- **CVE**: CVE-2023-12345
- **Severity**: Critical (CVSS 9.8)
- **Type**: SQL Injection
- **Location**: `src/auth/login.py:45`

### Changes Made
- Replaced string concatenation with parameterized queries
- Added input validation
- Updated unit tests

### Testing
- ✅ All 45 tests passing
- ✅ Security tests passed
- ✅ Code coverage: 94%
```

### PR #1235 - Dependency Update

```json
{
  "pr_number": 1235,
  "title": "⬆️ Security Update: Upgrade lodash to 4.17.21",
  "state": "merged",
  "merged_at": "2024-01-15T10:20:00Z"
}
```

### Testing Pull Requests

**Frontend UI:**
```
http://localhost:3000/pull-requests
```

**Expected Display:**
- 2 pull requests
- PR #1234: Open (Critical)
- PR #1235: Merged (High)
- Files changed, additions/deletions
- Review status
- CI/CD status

---

## 📊 Step 5: Event Flow

### Mock Data Location
```
mock-data/events.json
```

### Complete Event Timeline (15 Events)

```
00:00 → workflow.started
00:30 → agent.health_check
01:00 → scan.started
03:30 → vulnerability.detected (5 found)
04:00 → vulnerability.normalized
05:00 → remediation.requested
06:00 → remediation.started
08:00 → fix.generated
10:00 → patch.created
11:30 → tests.passed
12:00 → pr.created
13:00 → pr.reviewed
14:00 → pr.merged
15:00 → deployment.verified
15:30 → workflow.completed
```

### Testing Event Flow

**Frontend UI:**
```
http://localhost:3000/events
```

**Expected Display:**
- Real-time event stream
- 15 events in timeline
- Event type badges
- Timestamps
- Event payloads

---

## 📈 Step 6: Dashboard Metrics

### Mock Data Location
```
mock-data/dashboard-metrics.json
```

### Key Metrics

**Security Score: 87/100**
- Trend: +5 points this week

**Total Vulnerabilities: 5**
- Critical: 1
- High: 2
- Medium: 2
- Low: 0

**Mean Time to Remediate: 4.2 hours**

**Automation Rate: 92%**
- Automated fixes: 4/5
- Manual fixes: 1/5

### Testing Dashboard

**Frontend UI:**
```
http://localhost:3000/dashboard
```

**Expected Display:**
- Security score widget
- Vulnerability breakdown chart
- MTTR trend graph
- Automation rate
- Recent activity feed

---

## 🧪 Testing Instructions

### Prerequisites

```bash
# 1. Frontend running hona chahiye
cd frontend
npm run dev
# http://localhost:3000
```

### Test Scenarios

#### Scenario 1: View All Agents
```
1. Open http://localhost:3000/agents
2. Verify 8 agents visible
3. Check all agents "healthy"
4. Click on agent for details
```

#### Scenario 2: View Vulnerabilities
```
1. Open http://localhost:3000/vulnerabilities
2. Verify 5 vulnerabilities listed
3. Filter by severity (Critical, High, Medium)
4. Click on vulnerability for details
5. Check remediation status
```

#### Scenario 3: View Workflow
```
1. Open http://localhost:3000/workflows
2. Click on workflow "wf-20240115-001"
3. See 11 steps timeline
4. Check each step's status
5. View input/output for each step
```

#### Scenario 4: View Pull Requests
```
1. Open http://localhost:3000/pull-requests
2. See 2 PRs listed
3. Click on PR #1234
4. View files changed
5. Check review status
```

#### Scenario 5: View Events
```
1. Open http://localhost:3000/events
2. See real-time event stream
3. Filter by event type
4. Click on event for payload
```

#### Scenario 6: View Dashboard
```
1. Open http://localhost:3000/dashboard
2. Check security score
3. View vulnerability charts
4. See MTTR metrics
5. Check automation rate
```

---

## 🎯 Summary

### Mock Data Files

| File | Purpose | Records |
|------|---------|---------|
| `agents.json` | Agent registry | 8 agents |
| `vulnerabilities.json` | Detected vulnerabilities | 5 vulns |
| `remediation-workflow.json` | Workflow execution | 11 steps |
| `pull-requests.json` | Automated PRs | 2 PRs |
| `events.json` | Event timeline | 15 events |
| `dashboard-metrics.json` | Dashboard data | 100+ metrics |

### Complete Flow

```
Agent Registration (8 agents)
    ↓
Vulnerability Scan (5 found)
    ↓
Risk Prioritization (Critical → High → Medium)
    ↓
AI Fix Generation (Code patches)
    ↓
Automated Testing (45 tests passed)
    ↓
Pull Request Creation (2 PRs)
    ↓
Review & Merge
    ↓
Deployment Verification
    ↓
Vulnerability Resolved ✅
```

### Key Takeaways

1. **Agents**: 8 agents (5 scanners + 3 remediation)
2. **Vulnerabilities**: 5 detected (1 Critical, 2 High, 2 Medium)
3. **Workflow**: 11 steps, 15.5 minutes
4. **Pull Requests**: 2 automated PRs
5. **Events**: 15 events in timeline
6. **Automation**: 92% automated remediation

---

**Frontend URL**: http://localhost:3000

**Status**: ✅ Ready for Testing with Mock Data