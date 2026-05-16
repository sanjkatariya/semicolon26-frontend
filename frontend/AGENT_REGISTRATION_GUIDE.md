# 🤖 Agent Registration Guide

## Overview

The Agent Registration system allows you to integrate custom security agents into the Agentic Orchestrator platform. This guide covers everything you need to know about registering, configuring, and managing agents.

## What is an Agent?

An agent is an independent service that performs specific security operations such as:
- **Scanning**: Detecting vulnerabilities in code, containers, or infrastructure
- **Analyzing**: Deep analysis of code, dependencies, or configurations
- **Fixing**: Automated remediation of security issues
- **Notifying**: Sending alerts and notifications to teams

## Agent Types

### 🔍 Scanner Agents
**Purpose**: Detect vulnerabilities and security issues

**Examples**:
- Container vulnerability scanners (Trivy, Grype)
- Dependency scanners (Snyk, Dependabot)
- Code scanners (Semgrep, CodeQL)
- Infrastructure scanners (Checkov, Terrascan)

**Capabilities**:
- `scan_containers`
- `scan_dependencies`
- `scan_code`
- `scan_infrastructure`
- `detect_cve`
- `detect_secrets`

### 🔬 Analyzer Agents
**Purpose**: Perform deep analysis and provide insights

**Examples**:
- Dependency analyzers
- Code quality analyzers
- Architecture analyzers
- Compliance analyzers

**Capabilities**:
- `analyze_dependencies`
- `analyze_code_quality`
- `analyze_architecture`
- `analyze_compliance`
- `risk_assessment`
- `license_check`

### 🛠️ Fixer Agents
**Purpose**: Automatically remediate security issues

**Examples**:
- Auto-patchers
- Code fixers
- Configuration fixers
- Dependency updaters

**Capabilities**:
- `auto_patch`
- `fix_code`
- `fix_config`
- `update_dependencies`
- `generate_pr`
- `apply_fix`

### 📢 Notifier Agents
**Purpose**: Send notifications and alerts

**Examples**:
- Slack notifiers
- Email notifiers
- PagerDuty integrations
- Webhook notifiers

**Capabilities**:
- `send_slack`
- `send_email`
- `send_webhook`
- `create_ticket`
- `trigger_alert`

## Registration Process

### Step 1: Access Registration Page

Navigate to the agent registration page:
- Click "➕ Register" in the navigation bar
- Or click "➕ Register New Agent" button on the agents page
- URL: `/agents/register`

### Step 2: Fill Basic Information

#### Agent Name
- **Required**: Yes
- **Format**: Alphanumeric with spaces
- **Example**: "Custom Trivy Scanner", "Internal Code Analyzer"
- **Best Practice**: Use descriptive names that indicate purpose

#### Version
- **Required**: Yes
- **Format**: Semantic versioning (X.Y.Z)
- **Example**: "1.0.0", "2.3.1"
- **Best Practice**: Start with 1.0.0 for new agents

#### Agent Type
- **Required**: Yes
- **Options**: Scanner, Analyzer, Fixer, Notifier
- **Selection**: Choose based on primary function
- **Best Practice**: Select the most specific type

#### Category
- **Required**: Yes
- **Format**: Free text
- **Examples**: 
  - "Container Security"
  - "Dependency Management"
  - "Code Quality"
  - "Infrastructure Security"
- **Best Practice**: Use consistent categories across similar agents

#### Description
- **Required**: Yes
- **Format**: Multi-line text
- **Length**: 50-500 characters recommended
- **Content**: Explain what the agent does, what it scans/analyzes/fixes
- **Best Practice**: Be specific and include key features

### Step 3: Configure Connection

#### Agent Endpoint URL
- **Required**: Yes
- **Format**: Full HTTP/HTTPS URL
- **Example**: `https://agent.example.com/api/v1`
- **Requirements**:
  - Must be accessible from orchestrator
  - Should support HTTPS in production
  - Must implement agent API contract

#### Health Check Endpoint
- **Required**: Yes
- **Format**: Full HTTP/HTTPS URL
- **Example**: `https://agent.example.com/health`
- **Requirements**:
  - Must return 200 OK when healthy
  - Should respond within 5 seconds
  - Should check all dependencies

#### Test Connection
- Click "🔍 Test Connection" button
- Verifies endpoint accessibility
- Checks health endpoint response
- Validates API contract compliance

### Step 4: Define Capabilities

Capabilities define what operations the agent can perform.

#### Adding Capabilities
1. Type capability name in input field
2. Press Enter or click "+ Add" button
3. Capability appears as a tag
4. Add multiple capabilities as needed

#### Capability Naming Convention
- Use lowercase with underscores
- Be specific and descriptive
- Follow pattern: `action_target`

#### Examples
```
scan_containers
scan_dependencies
detect_cve
analyze_code
fix_vulnerabilities
send_notification
generate_report
```

#### Best Practices
- List all supported operations
- Use consistent naming across agents
- Document capability requirements
- Version capabilities if they change

### Step 5: Set Configuration

#### Timeout (seconds)
- **Default**: 30 seconds
- **Range**: 1-3600 seconds
- **Purpose**: Maximum execution time
- **Recommendations**:
  - Scanners: 60-300 seconds
  - Analyzers: 120-600 seconds
  - Fixers: 30-120 seconds
  - Notifiers: 5-30 seconds

#### Max Retries
- **Default**: 3 retries
- **Range**: 0-10 retries
- **Purpose**: Retry failed operations
- **Recommendations**:
  - Critical operations: 3-5 retries
  - Non-critical: 1-2 retries
  - Idempotent operations: Higher retries OK

#### Rate Limit (requests/minute)
- **Default**: 100 req/min
- **Range**: 1-10000 req/min
- **Purpose**: Prevent overwhelming agent
- **Recommendations**:
  - High-performance agents: 500-1000
  - Standard agents: 100-200
  - Resource-intensive: 10-50

### Step 6: Configure Authentication

#### Authentication Types

##### None
- No authentication required
- Use only for internal/trusted networks
- Not recommended for production

##### API Key
- Simple token-based authentication
- Agent validates key on each request
- Store key in credentials field
- Format: `your-api-key-here`

##### OAuth 2.0
- Industry-standard authentication
- Supports token refresh
- More secure than API keys
- Format: `client_id:client_secret` or token

##### Basic Auth
- Username and password authentication
- Base64 encoded credentials
- Format: `username:password`
- Less secure than OAuth 2.0

#### Credentials Storage
- All credentials encrypted at rest
- Stored in HashiCorp Vault
- Never logged or exposed in UI
- Rotated automatically (if configured)

### Step 7: Add Tags

Tags help organize and filter agents.

#### Adding Tags
1. Type tag name in input field
2. Press Enter or click "+ Add" button
3. Tag appears as a badge
4. Add multiple tags as needed

#### Tag Examples
```
production
staging
critical
container-security
kubernetes
aws
azure
compliance
pci-dss
hipaa
```

#### Best Practices
- Use consistent tag names
- Include environment tags (prod, staging, dev)
- Add compliance tags (pci-dss, hipaa, sox)
- Tag by technology (kubernetes, docker, terraform)
- Tag by criticality (critical, high, medium, low)

### Step 8: Submit Registration

1. Review all entered information
2. Click "🚀 Register Agent" button
3. System validates all fields
4. Agent registered in database
5. Success modal appears

### Step 9: Post-Registration

After successful registration:
- Agent appears in agent registry
- Health checks begin immediately
- Agent available for workflow creation
- Monitoring and metrics collection starts

## Agent API Contract

All agents must implement the following API contract:

### Health Check Endpoint
```
GET /health
Response: 200 OK
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600
}
```

### Execute Endpoint
```
POST /execute
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Request Body:
{
  "operation": "scan",
  "target": "docker.io/library/nginx:latest",
  "parameters": {
    "severity": "HIGH,CRITICAL"
  }
}

Response: 200 OK
{
  "status": "success",
  "results": {
    "vulnerabilities": [...],
    "summary": {...}
  },
  "execution_time": 45.2
}
```

### Capabilities Endpoint
```
GET /capabilities
Response: 200 OK
{
  "capabilities": [
    "scan_containers",
    "detect_cve"
  ],
  "version": "1.0.0"
}
```

## Agent Development

### Creating a Custom Agent

#### 1. Choose Technology Stack
- **Python**: FastAPI, Flask
- **Go**: Gin, Echo
- **Node.js**: Express, Fastify
- **Java**: Spring Boot

#### 2. Implement API Contract
```python
# Python FastAPI Example
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/execute")
async def execute(request: ExecuteRequest):
    # Implement your logic
    return {"status": "success", "results": {...}}

@app.get("/capabilities")
async def capabilities():
    return {"capabilities": ["scan_containers"]}
```

#### 3. Add Error Handling
```python
@app.exception_handler(Exception)
async def exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc)}
    )
```

#### 4. Implement Authentication
```python
from fastapi import Header, HTTPException

async def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401)
    token = authorization.split(" ")[1]
    # Verify token
    return token
```

#### 5. Add Logging
```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/execute")
async def execute(request: ExecuteRequest):
    logger.info(f"Executing {request.operation}")
    # Implementation
    logger.info("Execution completed")
```

#### 6. Containerize
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 7. Deploy
- Deploy to Kubernetes
- Configure service and ingress
- Set up monitoring
- Register in orchestrator

## Best Practices

### Security
- ✅ Always use HTTPS in production
- ✅ Implement proper authentication
- ✅ Validate all inputs
- ✅ Use secrets management (Vault)
- ✅ Implement rate limiting
- ✅ Log security events
- ❌ Never hardcode credentials
- ❌ Don't expose internal endpoints

### Performance
- ✅ Implement caching where appropriate
- ✅ Use async/await for I/O operations
- ✅ Set reasonable timeouts
- ✅ Implement connection pooling
- ✅ Monitor resource usage
- ❌ Don't block on long operations
- ❌ Avoid memory leaks

### Reliability
- ✅ Implement health checks
- ✅ Handle errors gracefully
- ✅ Support retries with backoff
- ✅ Implement circuit breakers
- ✅ Log all operations
- ✅ Monitor and alert
- ❌ Don't fail silently
- ❌ Avoid single points of failure

### Maintainability
- ✅ Use semantic versioning
- ✅ Document API changes
- ✅ Write unit tests
- ✅ Use consistent naming
- ✅ Keep code modular
- ❌ Don't break backward compatibility
- ❌ Avoid tight coupling

## Troubleshooting

### Registration Fails

**Problem**: Cannot register agent  
**Solutions**:
- Check all required fields are filled
- Verify endpoint URLs are valid
- Test connection before submitting
- Check network connectivity
- Review browser console for errors

### Connection Test Fails

**Problem**: Test connection returns error  
**Solutions**:
- Verify agent is running
- Check endpoint URL is correct
- Ensure agent is accessible from orchestrator
- Verify firewall rules
- Check agent logs for errors

### Agent Shows Unhealthy

**Problem**: Agent registered but shows unhealthy status  
**Solutions**:
- Check health endpoint is responding
- Verify agent is running
- Review agent logs
- Check resource usage (CPU, memory)
- Verify dependencies are available

### Agent Not Appearing in Workflows

**Problem**: Registered agent not available in workflow builder  
**Solutions**:
- Refresh the page
- Check agent status is "active"
- Verify agent health is "healthy"
- Check agent capabilities are defined
- Review agent registry service logs

## Support

### Documentation
- API Documentation: `/docs/api`
- Agent SDK: `/docs/sdk`
- Examples: `/docs/examples`

### Getting Help
- Check system logs: `/var/log/orchestrator/`
- Review agent logs
- Contact DevSecOps team
- File GitHub issue

### Monitoring
- Agent health dashboard: `/agents`
- Metrics: Prometheus/Grafana
- Logs: Loki/Elasticsearch
- Traces: Tempo/Jaeger

## Examples

### Example 1: Simple Scanner Agent
```python
from fastapi import FastAPI
import subprocess

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/execute")
async def execute(request: dict):
    target = request["target"]
    result = subprocess.run(
        ["trivy", "image", target],
        capture_output=True,
        text=True
    )
    return {
        "status": "success",
        "results": result.stdout
    }
```

### Example 2: Notifier Agent
```python
from fastapi import FastAPI
import requests

app = FastAPI()

@app.post("/execute")
async def execute(request: dict):
    webhook_url = request["parameters"]["webhook_url"]
    message = request["parameters"]["message"]
    
    response = requests.post(
        webhook_url,
        json={"text": message}
    )
    
    return {
        "status": "success",
        "results": {"sent": True}
    }
```

### Example 3: Fixer Agent
```python
from fastapi import FastAPI
import git

app = FastAPI()

@app.post("/execute")
async def execute(request: dict):
    repo_url = request["target"]
    fix_type = request["operation"]
    
    # Clone repo
    repo = git.Repo.clone_from(repo_url, "/tmp/repo")
    
    # Apply fix
    apply_fix(repo, fix_type)
    
    # Create PR
    pr_url = create_pull_request(repo)
    
    return {
        "status": "success",
        "results": {"pr_url": pr_url}
    }
```

---

**Last Updated**: 2026-05-14  
**Version**: 1.0.0  
**Author**: SecOps AI Team