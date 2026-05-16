# System Architecture - Agentic Orchestrator

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Microservices Breakdown](#microservices-breakdown)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Data Architecture](#data-architecture)
5. [Security Architecture](#security-architecture)
6. [Deployment Architecture](#deployment-architecture)
7. [Scalability & Performance](#scalability--performance)
8. [Disaster Recovery](#disaster-recovery)

---

## Architecture Overview

### Design Principles

1. **Microservices Architecture**
   - Single Responsibility Principle
   - Bounded Contexts (DDD)
   - Independent deployment
   - Technology heterogeneity

2. **Event-Driven Architecture**
   - Asynchronous communication
   - Event sourcing patterns
   - CQRS where applicable
   - Eventual consistency

3. **Cloud-Native**
   - Container-first
   - Kubernetes-native
   - Horizontal scalability
   - Self-healing

4. **Zero-Trust Security**
   - mTLS everywhere
   - No implicit trust
   - Least privilege access
   - Continuous verification

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          External Systems                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  GitHub  │  │  GitLab  │  │   Jira   │  │  Slack   │  │   AWS    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
└───────┼─────────────┼─────────────┼─────────────┼─────────────┼────────┘
        │             │             │             │             │
        └─────────────┴─────────────┴─────────────┴─────────────┘
                                    │
        ┌───────────────────────────▼───────────────────────────┐
        │              API Gateway (NGINX + Istio)              │
        │         OAuth2/OIDC • Rate Limiting • mTLS            │
        └───────────────────────────┬───────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        │                                                        │
┌───────▼────────┐                                    ┌─────────▼─────────┐
│   Frontend     │                                    │   Backend Core    │
│   (Next.js)    │◄──────────WebSocket───────────────│   Microservices   │
│                │                                    │                   │
│ • Dashboard    │                                    │ • 20+ Services    │
│ • Workflows    │                                    │ • Event-Driven    │
│ • Analytics    │                                    │ • Polyglot        │
└────────────────┘                                    └─────────┬─────────┘
                                                                │
                    ┌───────────────────────────────────────────┼───────────┐
                    │                                           │           │
        ┌───────────▼──────────┐              ┌────────────────▼────┐  ┌───▼────────┐
        │   Event Bus Layer    │              │   Data Layer        │  │   Agents   │
        │                      │              │                     │  │            │
        │ • Kafka (Primary)    │              │ • PostgreSQL        │  │ • Trivy    │
        │ • Redis Streams      │              │ • Elasticsearch     │  │ • Snyk     │
        │ • RabbitMQ (Backup)  │              │ • Redis Cache       │  │ • Checkov  │
        └──────────────────────┘              │ • Neo4j (Graph)     │  │ • Custom   │
                                              └─────────────────────┘  └────────────┘
```

---

## Microservices Breakdown

### 1. API Gateway Service

**Technology**: NGINX + Kong/Traefik  
**Responsibility**: Single entry point, routing, authentication, rate limiting

**Key Features**:
- Request routing to backend services
- JWT validation
- Rate limiting (per user/tenant)
- Request/response transformation
- API versioning
- CORS handling
- Circuit breaking

**APIs**:
```
GET    /health
GET    /api/v1/*          → Route to backend services
POST   /auth/login
POST   /auth/refresh
GET    /auth/logout
```

**Configuration**:
```yaml
rate_limiting:
  requests_per_minute: 1000
  burst: 100
circuit_breaker:
  failure_threshold: 5
  timeout: 30s
  half_open_requests: 3
```

**Scaling**: 3-10 replicas based on traffic

---

### 2. Identity & Access Service

**Technology**: Python FastAPI + PostgreSQL  
**Responsibility**: Authentication, authorization, user management, RBAC

**Database Schema**:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    tenant_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    tenant_id UUID NOT NULL,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    settings JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_roles_tenant ON roles(tenant_id);
```

**APIs**:
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/{id}
PUT    /api/v1/users/{id}
DELETE /api/v1/users/{id}
GET    /api/v1/roles
POST   /api/v1/roles
PUT    /api/v1/roles/{id}
POST   /api/v1/users/{id}/roles
```

**Events Produced**:
- `user.registered`
- `user.logged_in`
- `user.logged_out`
- `role.assigned`
- `permission.changed`

**Security**:
- Bcrypt password hashing (cost factor: 12)
- JWT with RS256 signing
- Refresh token rotation
- Session management
- MFA support (TOTP)

**Scaling**: 2-5 replicas, stateless

---

### 3. Agent Registry Service

**Technology**: Go + PostgreSQL  
**Responsibility**: Agent lifecycle, registration, health monitoring, capability discovery

**Database Schema**:
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- scanner, remediation, custom
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'inactive', -- active, inactive, unhealthy
    capabilities JSONB NOT NULL,
    configuration JSONB,
    metadata JSONB,
    last_heartbeat TIMESTAMP,
    registered_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    workflow_id UUID,
    status VARCHAR(50), -- pending, running, completed, failed
    input JSONB,
    output JSONB,
    error TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER
);

CREATE TABLE agent_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    status VARCHAR(50),
    response_time_ms INTEGER,
    error TEXT,
    checked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_executions_agent ON agent_executions(agent_id);
CREATE INDEX idx_executions_workflow ON agent_executions(workflow_id);
```

**APIs**:
```
POST   /api/v1/agents/register
GET    /api/v1/agents
GET    /api/v1/agents/{id}
PUT    /api/v1/agents/{id}
DELETE /api/v1/agents/{id}
POST   /api/v1/agents/{id}/heartbeat
GET    /api/v1/agents/{id}/health
GET    /api/v1/agents/{id}/capabilities
GET    /api/v1/agents/{id}/executions
```

**Events Produced**:
- `agent.registered`
- `agent.updated`
- `agent.deregistered`
- `agent.heartbeat`
- `agent.unhealthy`
- `agent.recovered`

**Events Consumed**:
- `agent.execution.requested`

**Health Check Strategy**:
- Heartbeat interval: 30 seconds
- Unhealthy threshold: 3 missed heartbeats
- Auto-deregister after: 10 minutes of inactivity

**Scaling**: 2-3 replicas

---

### 4. Agent Runtime Service

**Technology**: Go + Docker SDK  
**Responsibility**: Agent execution, sandboxing, resource management

**Key Features**:
- Containerized agent execution
- Resource limits (CPU, memory)
- Timeout enforcement
- Output capture
- Error handling
- Retry logic

**APIs**:
```
POST   /api/v1/runtime/execute
GET    /api/v1/runtime/executions/{id}
POST   /api/v1/runtime/executions/{id}/cancel
GET    /api/v1/runtime/executions/{id}/logs
GET    /api/v1/runtime/stats
```

**Execution Flow**:
```
1. Receive execution request
2. Validate agent exists and is healthy
3. Pull agent container image
4. Create isolated container with resource limits
5. Mount input data
6. Execute agent
7. Capture output and logs
8. Cleanup container
9. Publish results
```

**Events Produced**:
- `agent.execution.started`
- `agent.execution.completed`
- `agent.execution.failed`
- `agent.execution.timeout`

**Events Consumed**:
- `workflow.step.execute`
- `scan.requested`
- `remediation.requested`

**Resource Limits**:
```yaml
default_limits:
  cpu: "1000m"
  memory: "2Gi"
  timeout: "15m"
  disk: "10Gi"
```

**Scaling**: 5-20 replicas based on execution queue

---

### 5. Workflow Orchestrator Service

**Technology**: Python FastAPI + Temporal/Cadence  
**Responsibility**: Workflow definition, execution, state management

**Database Schema**:
```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID NOT NULL,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id),
    status VARCHAR(50), -- pending, running, completed, failed, cancelled
    input JSONB,
    output JSONB,
    context JSONB,
    error TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER
);

CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES workflow_runs(id),
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(100), -- agent, condition, parallel, human_approval
    status VARCHAR(50),
    input JSONB,
    output JSONB,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_workflows_tenant ON workflows(tenant_id);
CREATE INDEX idx_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX idx_runs_status ON workflow_runs(status);
CREATE INDEX idx_steps_run ON workflow_steps(run_id);
```

**Workflow DSL Example**:
```yaml
name: "Vulnerability Scan and Remediation"
version: 1
trigger:
  type: schedule
  cron: "0 2 * * *"

steps:
  - name: scan_code
    type: agent
    agent: trivy
    input:
      target: "{{ repository.url }}"
      scan_type: "code"
    retry:
      max_attempts: 3
      backoff: exponential
    
  - name: normalize_results
    type: agent
    agent: normalizer
    input:
      scan_results: "{{ steps.scan_code.output }}"
    
  - name: prioritize
    type: condition
    condition: "{{ steps.normalize_results.output.critical_count > 0 }}"
    then:
      - name: create_remediation_plan
        type: agent
        agent: remediation_planner
        
      - name: approval_gate
        type: human_approval
        approvers:
          - security-team
        timeout: 24h
        
      - name: apply_fixes
        type: parallel
        steps:
          - name: fix_dependencies
            type: agent
            agent: dependency_fixer
            
          - name: fix_code
            type: agent
            agent: code_patcher
    
  - name: create_pr
    type: agent
    agent: pr_creator
    input:
      changes: "{{ steps.apply_fixes.output }}"
      
  - name: notify
    type: agent
    agent: notifier
    input:
      channel: slack
      message: "Remediation PR created: {{ steps.create_pr.output.pr_url }}"
```

**APIs**:
```
POST   /api/v1/workflows
GET    /api/v1/workflows
GET    /api/v1/workflows/{id}
PUT    /api/v1/workflows/{id}
DELETE /api/v1/workflows/{id}
POST   /api/v1/workflows/{id}/execute
GET    /api/v1/workflows/runs
GET    /api/v1/workflows/runs/{id}
POST   /api/v1/workflows/runs/{id}/cancel
GET    /api/v1/workflows/runs/{id}/steps
POST   /api/v1/workflows/runs/{id}/retry
```

**Events Produced**:
- `workflow.created`
- `workflow.started`
- `workflow.step.started`
- `workflow.step.completed`
- `workflow.step.failed`
- `workflow.completed`
- `workflow.failed`
- `workflow.cancelled`

**Events Consumed**:
- `vulnerability.detected`
- `schedule.triggered`
- `manual.trigger`

**Scaling**: 3-8 replicas

---

### 6. Vulnerability Aggregation Service

**Technology**: Python FastAPI + Elasticsearch  
**Responsibility**: Collect vulnerabilities from multiple sources

**Database Schema**:
```sql
CREATE TABLE vulnerability_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100), -- scanner, feed, manual
    configuration JSONB,
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE raw_vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES vulnerability_sources(id),
    external_id VARCHAR(255),
    raw_data JSONB NOT NULL,
    ingested_at TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT false
);

CREATE INDEX idx_raw_vulns_source ON raw_vulnerabilities(source_id);
CREATE INDEX idx_raw_vulns_processed ON raw_vulnerabilities(processed);
```

**Elasticsearch Index**:
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "source": { "type": "keyword" },
      "external_id": { "type": "keyword" },
      "title": { "type": "text" },
      "description": { "type": "text" },
      "severity": { "type": "keyword" },
      "cvss_score": { "type": "float" },
      "cve_ids": { "type": "keyword" },
      "affected_assets": { "type": "nested" },
      "raw_data": { "type": "object", "enabled": false },
      "ingested_at": { "type": "date" }
    }
  }
}
```

**APIs**:
```
POST   /api/v1/vulnerabilities/ingest
GET    /api/v1/vulnerabilities/sources
POST   /api/v1/vulnerabilities/sources
GET    /api/v1/vulnerabilities/raw
POST   /api/v1/vulnerabilities/sync
```

**Events Produced**:
- `vulnerability.ingested`
- `vulnerability.batch.ingested`

**Events Consumed**:
- `scan.completed`
- `feed.updated`

**Scaling**: 3-10 replicas based on ingestion rate

---

### 7. Vulnerability Normalization Service

**Technology**: Python FastAPI + PostgreSQL  
**Responsibility**: Normalize, deduplicate, enrich vulnerabilities

**Database Schema**:
```sql
CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(50), -- critical, high, medium, low, info
    cvss_score DECIMAL(3,1),
    cvss_vector VARCHAR(255),
    cve_ids TEXT[],
    cwe_ids TEXT[],
    affected_component VARCHAR(255),
    affected_version VARCHAR(100),
    fixed_version VARCHAR(100),
    asset_id UUID,
    asset_type VARCHAR(100),
    repository_id UUID,
    file_path TEXT,
    line_number INTEGER,
    status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, false_positive
    first_detected TIMESTAMP DEFAULT NOW(),
    last_detected TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    metadata JSONB,
    tenant_id UUID NOT NULL
);

CREATE TABLE vulnerability_deduplication (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vulnerability_id UUID REFERENCES vulnerabilities(id),
    raw_vulnerability_id UUID,
    similarity_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vulns_severity ON vulnerabilities(severity);
CREATE INDEX idx_vulns_status ON vulnerabilities(status);
CREATE INDEX idx_vulns_tenant ON vulnerabilities(tenant_id);
CREATE INDEX idx_vulns_asset ON vulnerabilities(asset_id);
CREATE INDEX idx_vulns_cve ON vulnerabilities USING GIN(cve_ids);
```

**Normalization Logic**:
```python
def normalize_vulnerability(raw_vuln):
    # 1. Extract common fields
    # 2. Map severity to standard scale
    # 3. Calculate CVSS if missing
    # 4. Extract CVE/CWE IDs
    # 5. Identify affected asset
    # 6. Generate normalized ID
    # 7. Check for duplicates
    # 8. Enrich with external data
    return normalized_vuln
```

**APIs**:
```
GET    /api/v1/vulnerabilities
GET    /api/v1/vulnerabilities/{id}
PUT    /api/v1/vulnerabilities/{id}
POST   /api/v1/vulnerabilities/{id}/status
GET    /api/v1/vulnerabilities/stats
GET    /api/v1/vulnerabilities/trends
```

**Events Produced**:
- `vulnerability.normalized`
- `vulnerability.deduplicated`
- `vulnerability.enriched`
- `vulnerability.status.changed`

**Events Consumed**:
- `vulnerability.ingested`

**Scaling**: 3-8 replicas

---

### 8. Remediation Engine Service

**Technology**: Python FastAPI + PostgreSQL  
**Responsibility**: Generate and execute remediation plans

**Database Schema**:
```sql
CREATE TABLE remediation_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vulnerability_id UUID REFERENCES vulnerabilities(id),
    plan_type VARCHAR(100), -- automated, semi_automated, manual
    strategy VARCHAR(100), -- patch, upgrade, config_change, code_fix
    actions JSONB NOT NULL,
    estimated_effort VARCHAR(50),
    risk_level VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    approved_by UUID
);

CREATE TABLE remediation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES remediation_plans(id),
    workflow_run_id UUID,
    status VARCHAR(50), -- pending, running, completed, failed
    progress INTEGER DEFAULT 0,
    result JSONB,
    error TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_plans_vulnerability ON remediation_plans(vulnerability_id);
CREATE INDEX idx_plans_status ON remediation_plans(status);
CREATE INDEX idx_jobs_plan ON remediation_jobs(plan_id);
```

**APIs**:
```
POST   /api/v1/remediation/plans
GET    /api/v1/remediation/plans
GET    /api/v1/remediation/plans/{id}
POST   /api/v1/remediation/plans/{id}/approve
POST   /api/v1/remediation/plans/{id}/execute
GET    /api/v1/remediation/jobs
GET    /api/v1/remediation/jobs/{id}
POST   /api/v1/remediation/jobs/{id}/cancel
```

**Events Produced**:
- `remediation.plan.created`
- `remediation.plan.approved`
- `remediation.job.started`
- `remediation.job.completed`
- `remediation.job.failed`

**Events Consumed**:
- `vulnerability.normalized`
- `workflow.completed`

**Scaling**: 2-5 replicas

---

### 9. Git Integration Service

**Technology**: Go + PostgreSQL  
**Responsibility**: Git provider integration, repository management

**Database Schema**:
```sql
CREATE TABLE git_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50), -- github, gitlab, bitbucket
    api_url VARCHAR(255),
    credentials_vault_path VARCHAR(255),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES git_providers(id),
    external_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(500),
    url VARCHAR(500),
    default_branch VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_scanned TIMESTAMP,
    metadata JSONB,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_repos_provider ON repositories(provider_id);
CREATE INDEX idx_repos_tenant ON repositories(tenant_id);
```

**APIs**:
```
POST   /api/v1/git/providers
GET    /api/v1/git/providers
GET    /api/v1/git/repositories
POST   /api/v1/git/repositories/sync
GET    /api/v1/git/repositories/{id}
GET    /api/v1/git/repositories/{id}/branches
GET    /api/v1/git/repositories/{id}/commits
POST   /api/v1/git/repositories/{id}/clone
```

**Events Produced**:
- `repository.connected`
- `repository.synced`
- `repository.updated`

**Events Consumed**:
- `scan.requested`
- `remediation.job.started`

**Scaling**: 2-4 replicas

---

### 10. Pull Request Automation Service

**Technology**: Go + PostgreSQL  
**Responsibility**: Automated PR creation, review, merge

**Database Schema**:
```sql
CREATE TABLE pull_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID REFERENCES repositories(id),
    external_id VARCHAR(255),
    pr_number INTEGER,
    title VARCHAR(500),
    description TEXT,
    source_branch VARCHAR(255),
    target_branch VARCHAR(255),
    status VARCHAR(50), -- open, merged, closed
    remediation_job_id UUID,
    created_by VARCHAR(255),
    url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    merged_at TIMESTAMP
);

CREATE TABLE pr_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_id UUID REFERENCES pull_requests(id),
    reviewer VARCHAR(255),
    status VARCHAR(50), -- pending, approved, changes_requested
    comments TEXT,
    reviewed_at TIMESTAMP
);

CREATE INDEX idx_prs_repository ON pull_requests(repository_id);
CREATE INDEX idx_prs_status ON pull_requests(status);
```

**APIs**:
```
POST   /api/v1/pull-requests
GET    /api/v1/pull-requests
GET    /api/v1/pull-requests/{id}
POST   /api/v1/pull-requests/{id}/merge
POST   /api/v1/pull-requests/{id}/close
GET    /api/v1/pull-requests/{id}/reviews
```

**Events Produced**:
- `pr.created`
- `pr.updated`
- `pr.merged`
- `pr.closed`

**Events Consumed**:
- `remediation.job.completed`

**Scaling**: 2-4 replicas

---

### 11-20. Additional Services (Summary)

**11. Compliance Engine**: Policy evaluation, framework mapping, evidence collection  
**12. Notification Service**: Multi-channel notifications (Slack, email, PagerDuty)  
**13. Audit Logging Service**: Immutable audit trail, compliance logging  
**14. Dashboard API Service**: Aggregated data for UI, real-time metrics  
**15. Configuration Management**: Centralized config, feature flags  
**16. Secrets Management Adapter**: Vault integration, secret rotation  
**17. Event Bus Service**: Kafka management, topic provisioning  
**18. Plugin Marketplace**: Plugin discovery, versioning, distribution  
**19. Policy Engine**: OPA-based policy enforcement  
**20. Deployment Verification**: Post-deployment validation, rollback triggers

---

## Event-Driven Architecture

### Event Bus Topology

```
┌─────────────────────────────────────────────────────────────┐
│                     Apache Kafka Cluster                     │
│                    (3 Brokers, RF=3)                         │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌─────────▼────────┐  ┌────────▼────────┐
│  Topic Group 1  │  │  Topic Group 2   │  │  Topic Group 3  │
│  (Agents)       │  │  (Workflows)     │  │  (Security)     │
│                 │  │                  │  │                 │
│ • agent.*       │  │ • workflow.*     │  │ • vulnerability.*│
│ • scan.*        │  │ • remediation.*  │  │ • compliance.*  │
└─────────────────┘  └──────────────────┘  └─────────────────┘
```

### Key Event Topics

```yaml
# Agent Events
agent.registered:
  partitions: 3
  retention: 7d
  
agent.heartbeat:
  partitions: 6
  retention: 1d
  compaction: true
  
agent.execution.started:
  partitions: 12
  retention: 30d

# Vulnerability Events
vulnerability.detected:
  partitions: 12
  retention: 90d
  
vulnerability.normalized:
  partitions: 12
  retention: 90d

# Workflow Events
workflow.started:
  partitions: 6
  retention: 30d
  
workflow.step.completed:
  partitions: 12
  retention: 30d

# Remediation Events
remediation.plan.created:
  partitions: 6
  retention: 90d
  
remediation.job.completed:
  partitions: 6
  retention: 90d
```

### Event Schema Example

```json
{
  "event_id": "uuid",
  "event_type": "vulnerability.detected",
  "event_version": "1.0",
  "timestamp": "2026-05-13T14:42:00Z",
  "correlation_id": "uuid",
  "tenant_id": "uuid",
  "source": "trivy-agent",
  "payload": {
    "vulnerability_id": "uuid",
    "severity": "critical",
    "cve_id": "CVE-2024-1234",
    "affected_asset": {
      "type": "container_image",
      "name": "app:latest"
    }
  },
  "metadata": {
    "retry_count": 0,
    "priority": "high"
  }
}
```

### Event Processing Patterns

1. **At-Least-Once Delivery**: Kafka consumer groups with offset management
2. **Idempotency**: Event deduplication using event_id
3. **Dead Letter Queue**: Failed events moved to DLQ topics
4. **Retry Strategy**: Exponential backoff with max 5 retries
5. **Event Ordering**: Partition key based on entity ID

---

## Data Architecture

### Database Strategy

**PostgreSQL** (Primary OLTP):
- User data
- Configuration
- Transactional data
- Relational entities

**Elasticsearch** (Search & Analytics):
- Vulnerability search
- Log aggregation
- Full-text search
- Time-series analytics

**Redis** (Cache & Session):
- Session storage
- Rate limiting
- Real-time data
- Pub/Sub

**Neo4j** (Optional - Dependency Graph):
- Asset relationships
- Dependency chains
- Impact analysis

### Data Partitioning Strategy

```sql
-- Time-based partitioning for audit logs
CREATE TABLE audit_logs (
    id UUID,
    event_type VARCHAR(100),
    user_id UUID,
    tenant_id UUID,
    data JSONB,
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2026_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Tenant-based partitioning for vulnerabilities
CREATE TABLE vulnerabilities (
    id UUID,
    tenant_id UUID,
    ...
) PARTITION BY HASH (tenant_id);
```

### Data Retention Policy

```yaml
audit_logs: 2_years
vulnerabilities: 1_year
workflow_runs: 90_days
agent_executions: 30_days
metrics: 30_days
logs: 14_days
```

---

## Security Architecture

### Zero-Trust Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Service Mesh (Istio)                      │
│                                                              │
│  ┌──────────┐  mTLS  ┌──────────┐  mTLS  ┌──────────┐     │
│  │ Service A│◄──────►│ Service B│◄──────►│ Service C│     │
│  └──────────┘        └──────────┘        └──────────┘     │
│       │                   │                   │            │
│       └───────────────────┴───────────────────┘            │
│                           │                                │
│                    ┌──────▼──────┐                        │
│                    │   AuthZ     │                        │
│                    │   (OPA)     │                        │
│                    └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
1. User → API Gateway (JWT)
2. API Gateway → Identity Service (Validate JWT)
3. Identity Service → Return user context + permissions
4. API Gateway → Backend Service (JWT + mTLS)
5. Backend Service → Validate JWT + Check permissions
6. Backend Service → Process request
```

### RBAC Model

```yaml
roles:
  - name: security_admin
    permissions:
      - vulnerabilities:*
      - remediation:*
      - workflows:*
      - agents:*
      
  - name: security_analyst
    permissions:
      - vulnerabilities:read
      - remediation:read
      - workflows:read
      
  - name: developer
    permissions:
      - vulnerabilities:read
      - pull_requests:*
      - repositories:read
```

---

## Deployment Architecture

### Kubernetes Namespace Strategy

```
security-platform/
├── ingress/              # Ingress controllers
├── api-gateway/          # API Gateway
├── identity/             # Identity service
├── core-services/        # Core microservices
├── agents/               # Agent runtime
├── data/                 # Databases
├── messaging/            # Kafka, Redis
├── observability/        # Prometheus, Grafana
└── security/             # Vault, cert-manager
```

### High Availability Setup

```yaml
api_gateway:
  replicas: 3
  anti_affinity: true
  pdb:
    min_available: 2

identity_service:
  replicas: 3
  anti_affinity: true
  pdb:
    min_available: 2

postgresql:
  mode: ha
  replicas: 3
  replication: streaming

kafka:
  brokers: 3
  replication_factor: 3
  min_insync_replicas: 2
```

### Multi-Region Deployment

```
Region 1 (Primary)          Region 2 (DR)
┌─────────────────┐        ┌─────────────────┐
│  K8s Cluster    │        │  K8s Cluster    │
│  ┌───────────┐  │        │  ┌───────────┐  │
│  │ Services  │  │◄──────►│  │ Services  │  │
│  └───────────┘  │        │  └───────────┘  │
│  ┌───────────┐  │        │  ┌───────────┐  │
│  │ PostgreSQL│  │◄──────►│  │ PostgreSQL│  │
│  │ (Primary) │  │ Async  │  │ (Replica) │  │
│  └───────────┘  │ Repl   │  └───────────┘  │
└─────────────────┘        └─────────────────┘
```

---

## Scalability & Performance

### Horizontal Scaling Strategy

```yaml
agent_runtime:
  min_replicas: 5
  max_replicas: 50
  target_cpu: 70%
  target_memory: 80%
  scale_up_stabilization: 60s
  scale_down_stabilization: 300s

workflow_orchestrator:
  min_replicas: 3
  max_replicas: 20
  target_cpu: 75%
  custom_metrics:
    - workflow_queue_depth > 100
```

### Caching Strategy

```
L1: Application Cache (In-Memory)
    ├─ User sessions (5 min TTL)
    └─ Configuration (10 min TTL)

L2: Redis Cache
    ├─ API responses (1 min TTL)
    ├─ Query results (5 min TTL)
    └─ Aggregated metrics (30 sec TTL)

L3: CDN Cache
    ├─ Static assets (1 day TTL)
    └─ Public API responses (5 min TTL)
```

### Performance Targets

```yaml
api_latency:
  p50: < 100ms
  p95: < 500ms
  p99: < 1000ms

throughput:
  api_requests: 10000 req/s
  event_processing: 50000 events/s
  vulnerability_ingestion: 1000 vulns/s

availability: 99.9%
```

---

## Disaster Recovery

### Backup Strategy

```yaml
postgresql:
  full_backup: daily
  incremental: hourly
  retention: 30_days
  
elasticsearch:
  snapshot: daily
  retention: 14_days
  
kafka:
  replication: 3
  min_insync: 2
```

### Recovery Procedures

```
RTO (Recovery Time Objective): 1 hour
RPO (Recovery Point Objective): 15 minutes

Failover Process:
1. Detect primary region failure
2. Promote DR region to primary
3. Update DNS/Load balancer
4. Verify data consistency
5. Resume operations
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-13  
**Next Review**: 2026-06-13