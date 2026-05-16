import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'Agentic Orchestrator - Security Automation Platform',
    template: '%s | Agentic Orchestrator',
  },
  description:
    'Enterprise-grade Security Orchestration, Automation, and Remediation (SOAR) platform for automated vulnerability management and remediation.',
  keywords: [
    'security',
    'vulnerability management',
    'automation',
    'remediation',
    'SOAR',
    'DevSecOps',
    'compliance',
  ],
  authors: [{ name: 'Security Engineering Team' }],
  creator: 'Agentic Orchestrator',
  publisher: 'Agentic Orchestrator',
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://agentic-orchestrator.io',
    title: 'Agentic Orchestrator - Security Automation Platform',
    description:
      'Enterprise-grade Security Orchestration, Automation, and Remediation (SOAR) platform',
    siteName: 'Agentic Orchestrator',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agentic Orchestrator',
    description: 'Enterprise Security Automation Platform',
    creator: '@agentic_orchestrator',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}

// Made with Bob
