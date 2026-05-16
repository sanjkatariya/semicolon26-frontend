# Agentic Orchestrator Frontend

Agentic Orchestrator is a hackathon-ready security automation dashboard built with Next.js, React, TypeScript, and Tailwind CSS. It demonstrates authenticated access, security posture monitoring, vulnerability tracking, automated remediation workflow execution, pull request tracking, and infrastructure/Kubernetes scan workflows.

## What This Demo Shows

- Login-gated security dashboard
- Signed HttpOnly session cookie authentication
- Vulnerability and pull request tabs with repository-level grouping
- Repository remediation workflow using the backend SSE workflow API
- Infrastructure scan workflow with two modes:
  - Repository IaC scan
  - Kubernetes cluster scan
- Included security findings, workflow history, agent data, PRs, and infrastructure scan results

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Lucide React icons
- Local JSON-backed demo data

## Quick Start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

The dashboard routes are protected. Unauthenticated users are redirected to `/login`.

## Demo Login

Default local demo credentials:

```text
Email: admin@semicolon.ai
Access key: Semicolon@2026
```

For deployments, set real values in environment configuration:

```env
AUTH_SESSION_SECRET=replace-with-a-long-random-session-secret
DEMO_ADMIN_EMAIL=admin@semicolon.ai
DEMO_ADMIN_PASSWORD=replace-with-demo-access-key
DEMO_ADMIN_NAME=Security Admin
DEMO_ADMIN_ROLE=admin
```

## Authentication Model

This project does not require a database for the hackathon demo. Instead:

- Credentials are read from server-side environment configuration.
- Successful login creates a signed session token.
- The token is stored in an HttpOnly cookie named `semicolon_session`.
- Protected routes are enforced by `src/middleware.ts`.
- Client-side JavaScript cannot read the session cookie.

Production path:

- Replace the demo credential provider with OAuth/SSO or a database-backed identity provider.
- Add role-based access control, audit logging, password hashing for local accounts, and secret rotation.

More details are in `SECURITY.md`.

## Main Routes

```text
/login              Sign in page
/dashboard          Security posture dashboard
/workflows          Workflow execution history
/workflows/execute  Run repo remediation or infrastructure scan workflows
/agents             Registered security agents
/vulnerabilities    Vulnerability tab with repo grouping
/pull-requests      PR tab with repo grouping
```

## Workflow Modes

### Repository Remediation

The existing repository workflow is preserved. It triggers the configured workflow backend through the SSE API and tracks:

- Repository scan
- GitHub issue creation
- Vulnerability analysis
- Remediation
- Validation
- Pull request creation

### Infrastructure Scan

The infrastructure workflow uses local JSON-backed demo data and four focused agents:

- Access or target preparation
- Infrastructure/Kubernetes scan
- Risk analysis
- Report and recommendations

Kubernetes scan inputs include:

- Cluster name
- Kubeconfig context
- Namespace scope
- Cloud provider
- Compliance profile
- Severity levels
- RBAC checks
- Network policy checks
- Secret exposure checks
- Timeout

Infrastructure scan data source:

```text
public data directory
```

## Included Data Files

```text
dashboard metrics
workflow history
vulnerability findings
pull request records
infrastructure scan results
agent registry
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build production bundle
npm run start        # Start production server
npm run type-check   # Run TypeScript without emit
npm run lint         # Run Next lint
```

## Verification Checklist

Before submitting:

```bash
npm run type-check
npm run build
```

Manual smoke test:

- `/dashboard` redirects to `/login` when not authenticated.
- Correct login opens `/dashboard`.
- Wrong login returns `401`.
- `/workflows/execute` loads and can start the infrastructure scan workflow.
- `/vulnerabilities` and `/pull-requests` load repository-grouped data.

## Repo Hygiene

Generated files are intentionally ignored:

```text
.next
tsconfig.tsbuildinfo
*.log
```

Do not commit generated build output. Keep only source code, configuration templates, and included demo data needed for the application.
