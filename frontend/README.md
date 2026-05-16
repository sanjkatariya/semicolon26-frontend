# Agentic Orchestrator - Frontend

Enterprise-grade Security Orchestration Platform built with Next.js 15, React 19, and TypeScript.

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5.3
- **Styling**: TailwindCSS + shadcn/ui
- **State Management**: Zustand + TanStack Query
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Code Editor**: Monaco Editor
- **Real-time**: Socket.IO Client
- **Forms**: React Hook Form + Zod

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/       # Authentication pages
│   │   ├── (dashboard)/  # Dashboard pages
│   │   ├── api/          # API routes
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   └── globals.css   # Global styles
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── layout/       # Layout components
│   │   ├── agents/       # Agent-related components
│   │   ├── vulnerabilities/
│   │   ├── remediation/
│   │   ├── workflows/
│   │   ├── compliance/
│   │   ├── audit/
│   │   ├── dashboard/
│   │   ├── notifications/
│   │   ├── repositories/
│   │   ├── pull-requests/
│   │   ├── monitoring/
│   │   ├── deployment/
│   │   ├── common/
│   │   └── charts/
│   └── lib/              # Utilities and hooks
│       ├── api/          # API client functions
│       ├── hooks/        # Custom React hooks
│       ├── store/        # Zustand stores
│       ├── utils/        # Utility functions
│       └── types/        # TypeScript types
└── tests/                # Test files
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=false
```

## 📝 Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run type-check       # Run TypeScript compiler
npm run format           # Format code with Prettier

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run E2E tests

# Analysis
npm run analyze          # Analyze bundle size
```

## 🎨 UI Components

### shadcn/ui Components

The project uses shadcn/ui for base components. To add new components:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
```

### Custom Components

#### Agent Components
- `AgentCard` - Display agent information
- `AgentHealthCard` - Show agent health status
- `AgentList` - List of agents with filtering
- `AgentDetails` - Detailed agent view
- `AgentRegistrationForm` - Register new agents

#### Vulnerability Components
- `VulnerabilityCard` - Display vulnerability details
- `VulnerabilityList` - Filterable vulnerability list
- `VulnerabilityDetails` - Detailed vulnerability view
- `SeverityBadge` - Severity indicator
- `CVSSScore` - CVSS score display

#### Remediation Components
- `RemediationTimeline` - Visual remediation progress
- `RemediationPlanCard` - Remediation plan display
- `RemediationJobStatus` - Job status indicator
- `RemediationApproval` - Approval workflow UI

#### Workflow Components
- `WorkflowCanvas` - Visual workflow builder
- `WorkflowBuilder` - Drag-and-drop workflow editor
- `WorkflowStepNode` - Individual workflow step
- `WorkflowRunStatus` - Workflow execution status
- `WorkflowTimeline` - Execution timeline

## 🔌 API Integration

### API Client

```typescript
import { apiClient } from '@/lib/api/client';

// Fetch agents
const agents = await apiClient.get('/api/v1/agents');

// Create workflow
const workflow = await apiClient.post('/api/v1/workflows', data);
```

### React Query Hooks

```typescript
import { useAgents, useVulnerabilities } from '@/lib/hooks';

function MyComponent() {
  const { data: agents, isLoading } = useAgents();
  const { data: vulnerabilities } = useVulnerabilities({
    severity: 'critical',
  });
  
  // ...
}
```

### WebSocket Connection

```typescript
import { useWebSocket } from '@/lib/hooks/useWebSocket';

function LiveUpdates() {
  const { data, isConnected } = useWebSocket('/events');
  
  // Receive real-time updates
}
```

## 🎯 State Management

### Zustand Stores

```typescript
import { useAuthStore } from '@/lib/store/authStore';

function MyComponent() {
  const { user, login, logout } = useAuthStore();
  
  // ...
}
```

### TanStack Query

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

function MyComponent() {
  const { data } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  });
  
  const mutation = useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      // Invalidate and refetch
    },
  });
}
```

## 🎨 Styling Guidelines

### Tailwind Classes

```tsx
// Use semantic color classes
<div className="bg-primary text-primary-foreground">

// Use severity-specific classes
<div className="severity-critical">

// Use status classes
<div className="status-active">
```

### Custom CSS

```css
/* Use CSS variables for theming */
.custom-component {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

## 🧪 Testing

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react';
import { AgentCard } from '@/components/agents/AgentCard';

describe('AgentCard', () => {
  it('renders agent information', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('Trivy')).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

## 📦 Build & Deployment

### Production Build

```bash
# Build the application
npm run build

# The output will be in .next/ directory
```

### Docker Build

```bash
# Build Docker image
docker build -t agentic-orchestrator-frontend .

# Run container
docker run -p 3000:3000 agentic-orchestrator-frontend
```

### Environment-Specific Builds

```bash
# Development
npm run build

# Staging
NODE_ENV=staging npm run build

# Production
NODE_ENV=production npm run build
```

## 🔒 Security

### Content Security Policy

Configured in `next.config.js`:
- Strict CSP headers
- XSS protection
- Frame options
- HTTPS enforcement

### Authentication

- NextAuth.js for authentication
- JWT tokens with RS256
- Refresh token rotation
- Session management

### API Security

- CORS configuration
- Rate limiting
- Request validation
- Error handling

## 🚀 Performance

### Optimization Techniques

- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Font Optimization**: Next.js Font optimization
- **Bundle Analysis**: `npm run analyze`
- **Caching**: React Query caching strategy
- **Lazy Loading**: Dynamic imports for heavy components

### Performance Targets

- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1

## 🌐 Internationalization

```typescript
// Add i18n support (future enhancement)
import { useTranslation } from 'next-i18next';

function MyComponent() {
  const { t } = useTranslation('common');
  return <h1>{t('welcome')}</h1>;
}
```

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- Touch-friendly UI elements
- Adaptive layouts

## ♿ Accessibility

- WCAG 2.1 AA compliance
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management

## 🐛 Debugging

### Development Tools

```bash
# Enable React DevTools
# Enable Redux DevTools (if using Redux)
# Enable TanStack Query DevTools (enabled by default in dev)
```

### Logging

```typescript
import { logger } from '@/lib/utils/logger';

logger.info('User logged in', { userId: user.id });
logger.error('API request failed', { error });
```

## 📚 Documentation

- [Architecture](../../docs/architecture/SYSTEM_ARCHITECTURE.md)
- [API Reference](../../docs/api/README.md)
- [Component Library](./docs/components.md)
- [Style Guide](./docs/style-guide.md)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Run linting and type checking
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Next.js team
- Vercel
- shadcn/ui
- TailwindCSS
- React team

---

**Built with ❤️ by the Security Engineering Team**