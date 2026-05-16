'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, Lock, Shield, UserRound, Zap } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginShell() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
      </div>
    </main>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('admin@semicolon.ai');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nextPath = useMemo(() => searchParams.get('next') || '/dashboard', [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('Unable to reach authentication service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8">
        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
              <Shield className="h-4 w-4" />
              Agentic Orchestrator
            </div>

            <div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white md:text-5xl">
                Security automation dashboard access
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
                Sign in to view vulnerability posture, workflow execution, automated PRs, and infrastructure scan results.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <Activity className="mb-3 h-5 w-5 text-green-300" />
                <div className="text-2xl font-bold text-white">87</div>
                <div className="text-xs text-slate-500">Security score</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <Zap className="mb-3 h-5 w-5 text-purple-300" />
                <div className="text-2xl font-bold text-white">78%</div>
                <div className="text-xs text-slate-500">Automation rate</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <Lock className="mb-3 h-5 w-5 text-blue-300" />
                <div className="text-2xl font-bold text-white">HttpOnly</div>
                <div className="text-xs text-slate-500">Session cookie</div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-blue-950/30 backdrop-blur">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-slate-500">
                  <UserRound className="h-4 w-4" />
                  Secure sign in
                </div>
                <h2 className="mt-2 text-2xl font-bold text-white">Welcome back</h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  placeholder="admin@semicolon.ai"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Access key
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Enter demo access key"
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-400">
              Session is issued as a signed HttpOnly cookie and protected routes are checked by middleware.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
