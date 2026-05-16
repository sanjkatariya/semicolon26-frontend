# Live Workflow Execution Guide

## Overview

The Live Workflow Execution feature integrates your real backend API (`http://127.0.0.1:8010/api/workflow/trigger`) with the frontend UI, providing real-time visualization of automated vulnerability remediation workflows using Server-Sent Events (SSE) streaming.

## Architecture

### Components

1. **Types** (`frontend/src/types/workflow-execution.ts`)
   - `WorkflowTriggerRequest`: Request payload for triggering workflows
   - `AgentStatusEvent`: Real-time agent status updates
   - `WorkflowCompletedEvent`: Final workflow completion event
   - `WorkflowExecution`: Complete workflow execution state
   - `WorkflowStep`: Individual step in the pipeline

2. **API Client** (`frontend/src/lib/workflow-api.ts`)
   - `WorkflowAPIClient`: Handles SSE streaming connection
   - Custom fetch-based SSE implementation (EventSource doesn't support POST)
   - Automatic event parsing and error handling

3. **UI Page** (`frontend/src/app/workflows/live-execution/page.tsx`)
   - Real-time workflow visualization
   - Horizontal pipeline with animated steps
   - Event stream display
   - Step details with data

## Features

### 1. Real-Time Pipeline Visualization

```
START → Scanner → Analysis → Remediation → Validation → PR → END
```

- **Circular nodes** that change color based on status:
  - Gray: Pending
  - Blue (pulsing): Running
  - Green: Completed
  - Red: Failed

- **Connecting lines** that animate as steps progress

### 2. Live Event Streaming

All SSE events from your backend are captured and displayed:

```json
{
  "event": "agent_status",
  "agent": "scanner_agent",
  "status": "completed",
  "timestamp": "2026-05-15T05:10:01Z",
  "data": {
    "findings": [...]
  }
}
```

### 3. Step Details

Each agent's execution data is displayed in expandable cards:
- Scanner findings
- Analysis results
- Remediation changes
- Validation results
- Pull request details

### 4. Execution Summary

Final metrics displayed after completion:
- Total vulnerabilities found
- Number remediated
- Validation status

## Usage

### 1. Start Your Backend API

```bash
# Make sure your backend is running on port 8010
python your_backend_server.py
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

### 3. Navigate to Live Execution

- Click **"▶️ Live Execution"** in the navigation bar
- Or visit: `http://localhost:3000/workflows/live-execution`

### 4. Configure and Execute

1. **Enter Repository URL**: `https://github.com/kim815/vulnerable-repo`
2. **Enter Branch**: `main`
3. **Click "Execute Workflow"**

### 5. Watch Real-Time Progress

The UI will automatically:
- Connect to your backend via SSE
- Display each agent as it starts/completes
- Show all event data in real-time
- Update the pipeline visualization
- Display final summary

## API Integration

### Backend API Endpoint

```
POST http://127.0.0.1:8010/api/workflow/trigger
Content-Type: application/json

{
  "repo_url": "https://github.com/owner/repo",
  "branch": "main",
  "triggered_by": "ui"
}
```

### Expected SSE Events

Your backend should emit these events:

#### 1. Agent Status Events

```
event: agent_status
data: {"event": "agent_status", "agent": "scanner_agent", "status": "started", "timestamp": "..."}

event: agent_status
data: {"event": "agent_status", "agent": "scanner_agent", "status": "completed", "timestamp": "...", "data": {...}}
```

#### 2. Workflow Completion Event

```
event: workflow_completed
data: {
  "event": "workflow_completed",
  "status": "completed",
  "timestamp": "...",
  "summary": {
    "total_vulnerabilities": 2,
    "remediated": 2,
    "validation": "passed"
  }
}
```

## Workflow Steps

The UI expects these agents in order:

1. **scanner_agent**: Scans repository for vulnerabilities
2. **analysis_agent**: Analyzes findings and determines fixes
3. **remediation_agent**: Applies fixes to code
4. **validation_agent**: Validates fixes work correctly
5. **pr_agent**: Creates pull request with changes

## Configuration

### Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_WORKFLOW_API_URL=http://127.0.0.1:8010
```

### Customizing Workflow Steps

Edit `frontend/src/app/workflows/live-execution/page.tsx`:

```typescript
const workflowSteps: WorkflowStep[] = [
  { id: 'scanner', name: 'Scanner', agent: 'scanner_agent', status: 'pending' },
  { id: 'analysis', name: 'Analysis', agent: 'analysis_agent', status: 'pending' },
  // Add more steps...
];
```

## Error Handling

The UI handles:
- Connection errors
- Parsing errors
- Agent failures
- Workflow failures

Errors are logged to console and displayed in the UI.

## Data Flow

```
User Input (Repo URL, Branch)
    ↓
Frontend triggers workflow
    ↓
POST to backend API
    ↓
Backend starts SSE stream
    ↓
Frontend receives events
    ↓
UI updates in real-time
    ↓
Workflow completes
    ↓
Summary displayed
```

## Example Workflow Execution

### 1. Scanner Agent

**Input**: Repository URL
**Output**: List of vulnerabilities

```json
{
  "findings": [
    {
      "ecosystem": "npm",
      "package": "axios",
      "severity": "high",
      "cve": "CWE-918",
      "vulnerable_version": "<0.21.1",
      "patched_version": ">=1.16.1"
    }
  ]
}
```

### 2. Analysis Agent

**Input**: Vulnerabilities
**Output**: Remediation plan

```json
{
  "analysis": [
    {
      "dependency": "axios",
      "severity": "HIGH",
      "current_version": "<0.21.1",
      "recommended_version": "^1.16.1",
      "fix_strategy": "Upgrade dependency version"
    }
  ]
}
```

### 3. Remediation Agent

**Input**: Remediation plan
**Output**: Code changes

```json
{
  "remediation": [
    {
      "dependency": "axios",
      "old_version": "0.18.0",
      "new_version": "^1.16.1",
      "llm_used": true,
      "notes": "Updated package.json dependencies"
    }
  ]
}
```

### 4. Validation Agent

**Input**: Code changes
**Output**: Validation result

```json
{
  "validation": {
    "passed": true,
    "details": "Scanner no longer reports the targeted vulnerabilities"
  }
}
```

### 5. PR Agent

**Input**: Validated changes
**Output**: Pull request

```json
{
  "pr": {
    "url": "https://api.github.com/repos/owner/repo/pulls/8",
    "html_url": "https://github.com/owner/repo/pull/8",
    "number": 8,
    "state": "open",
    "title": "Automated Security Fix: dependency vulnerability remediation"
  }
}
```

## Troubleshooting

### TypeScript Errors

If you see import errors, restart the TypeScript server:
1. Open VS Code Command Palette (Ctrl+Shift+P)
2. Run "TypeScript: Restart TS Server"

### Connection Issues

1. Verify backend is running: `curl http://127.0.0.1:8010/health`
2. Check CORS settings on backend
3. Verify `.env.local` has correct URL

### SSE Not Working

1. Check browser console for errors
2. Verify backend sends proper SSE format:
   ```
   event: agent_status
   data: {...}
   
   ```
3. Ensure `Content-Type: text/event-stream` header

## Advanced Features

### Custom Event Handlers

```typescript
const eventSource = WorkflowAPIClient.triggerWorkflow(
  request,
  (event) => {
    // Custom event handling
    if (event.event === 'agent_status') {
      console.log(`Agent ${event.agent} is ${event.status}`);
    }
  },
  (error) => {
    // Custom error handling
    console.error('Workflow error:', error);
  },
  () => {
    // Custom completion handling
    console.log('Workflow completed!');
  }
);
```

### Extending Workflow Steps

Add new agents by:
1. Adding step to `workflowSteps` array
2. Backend emits events for new agent
3. UI automatically displays new step

## Performance

- SSE connection is lightweight
- Events are parsed incrementally
- UI updates are optimized with React state
- Large data payloads are scrollable

## Security

- API URL configurable via environment variable
- No sensitive data stored in frontend
- All communication over HTTP (use HTTPS in production)
- CORS must be configured on backend

## Future Enhancements

- [ ] Workflow history/replay
- [ ] Pause/resume workflows
- [ ] Manual approval steps
- [ ] Workflow templates
- [ ] Multi-repository execution
- [ ] Scheduled workflows
- [ ] Webhook triggers

## Support

For issues or questions:
1. Check browser console for errors
2. Verify backend API is responding
3. Review SSE event format
4. Check network tab in DevTools

---

**Built with**: Next.js 15, React 19, TypeScript, TailwindCSS, SSE Streaming