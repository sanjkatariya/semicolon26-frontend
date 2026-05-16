'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/agents', label: 'Agents', icon: '🤖' },
    { href: '/vulnerabilities', label: 'Vulnerabilities', icon: '🔍' },
    { href: '/workflows', label: 'Workflows', icon: '⚙️' },
    { href: '/pull-requests', label: 'Pull Requests', icon: '📝' },
    { href: '/agent-config-demo', label: 'Quick Scan', icon: '🧪' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🛡️</div>
            <span className="text-xl font-bold text-white">Agentic Orchestrator</span>
          </div>
          
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href === '/workflows' && pathname?.startsWith('/workflows')) ||
                (item.href === '/agents' && pathname?.startsWith('/agents'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-200"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Made with Bob
