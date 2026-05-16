# Frontend Installation Guide

## Fixed Dependency Issues ✅

The package.json has been updated to resolve React 19 compatibility issues:

### Changes Made:
- ✅ Replaced `react-flow-renderer@10.3.17` with `@xyflow/react@12.0.0` (React 19 compatible)
- ✅ Added `next-themes@0.2.1` for theme provider
- ✅ Added `tailwindcss-animate@1.0.7` for animations

## Installation Steps

### 1. Install Dependencies

```bash
cd frontend
npm install
```

If you still encounter issues, try:

```bash
npm install --legacy-peer-deps
```

### 2. Create Environment File

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Package Updates

### React Flow (Workflow Builder)

**Old**: `react-flow-renderer@10.3.17` (React 16-18 only)
**New**: `@xyflow/react@12.0.0` (React 19 compatible)

**Usage Update**:
```typescript
// Old import
import ReactFlow from 'react-flow-renderer';

// New import
import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
```

## Verification

After installation, verify everything works:

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

## Troubleshooting

### Issue: Peer dependency warnings

**Solution**: Use `--legacy-peer-deps` flag
```bash
npm install --legacy-peer-deps
```

### Issue: Module not found errors

**Solution**: Clear cache and reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript errors

**Solution**: Restart TypeScript server in VS Code
- Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
- Type "TypeScript: Restart TS Server"
- Press Enter

## Next Steps

1. ✅ Dependencies installed
2. ✅ Environment configured
3. ✅ Development server running
4. 🎨 Start building components with mock data!

## Mock Data Integration

All mock data is ready to use:

```typescript
import vulnerabilities from '../mock-data/vulnerabilities.json';
import agents from '../mock-data/agents.json';
import workflow from '../mock-data/remediation-workflow.json';
import pullRequests from '../mock-data/pull-requests.json';
import events from '../mock-data/events.json';
import metrics from '../mock-data/dashboard-metrics.json';

// Use in your components
export default function Dashboard() {
  return (
    <div>
      <h1>Security Score: {metrics.dashboard.overview.security_score}</h1>
      <VulnerabilityList data={vulnerabilities.vulnerabilities} />
    </div>
  );
}
```

## Support

If you encounter any issues:
1. Check the error message carefully
2. Refer to `frontend/README.md` for detailed documentation
3. Check `GETTING_STARTED.md` for setup instructions
4. Review `mock-data/README.md` for data usage examples

---

**Status**: Ready for Development ✅
**Last Updated**: 2026-05-14