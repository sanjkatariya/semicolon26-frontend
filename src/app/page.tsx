import Link from 'next/link';
import { ArrowRight, Shield, Zap, Lock, Activity } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Agentic Orchestrator</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Zap className="h-4 w-4" />
            Enterprise Security Automation Platform
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            Automated Vulnerability
            <br />
            <span className="text-primary">Remediation at Scale</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered Security Orchestration, Automation, and Remediation (SOAR)
            platform that integrates vulnerability scanners, remediation engines, and
            automated deployment pipelines.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              View Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Documentation
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Multi-Scanner Integration"
            description="Aggregate vulnerabilities from Trivy, Snyk, Checkov, Semgrep, and more"
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="Automated Remediation"
            description="AI-powered code patching and infrastructure fixes with automated PRs"
          />
          <FeatureCard
            icon={<Lock className="h-6 w-6" />}
            title="Compliance Engine"
            description="Continuous compliance monitoring for SOC2, ISO27001, PCI-DSS, HIPAA"
          />
          <FeatureCard
            icon={<Activity className="h-6 w-6" />}
            title="Real-time Monitoring"
            description="Live vulnerability detection and remediation progress tracking"
          />
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 p-8 rounded-2xl border bg-card">
          <StatCard value="99.9%" label="Platform Uptime" />
          <StatCard value="<100ms" label="API Response Time" />
          <StatCard value="50K+" label="Events/Second" />
        </div>

        {/* Architecture Preview */}
        <div className="mt-20 p-8 rounded-2xl border bg-card">
          <h2 className="text-3xl font-bold text-center mb-8">
            Enterprise-Grade Architecture
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <ArchitectureCard
              title="Microservices"
              items={[
                '20+ Independent Services',
                'Event-Driven Architecture',
                'Horizontal Scalability',
                'Zero-Trust Security',
              ]}
            />
            <ArchitectureCard
              title="Technology Stack"
              items={[
                'Next.js 15 + React 19',
                'Python FastAPI + Go',
                'Kubernetes + Istio',
                'Kafka + PostgreSQL',
              ]}
            />
            <ArchitectureCard
              title="Observability"
              items={[
                'OpenTelemetry Tracing',
                'Prometheus Metrics',
                'Grafana Dashboards',
                'Loki Log Aggregation',
              ]}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              © 2026 Agentic Orchestrator. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/docs"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Documentation
              </Link>
              <Link
                href="/api"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                API Reference
              </Link>
              <Link
                href="/support"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
      <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-primary mb-2">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function ArchitectureCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Made with Bob
