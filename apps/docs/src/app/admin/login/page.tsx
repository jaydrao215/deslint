'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/admin/dashboard');
        return;
      }

      if (res.status === 429) {
        setError('Too many attempts. Try again later.');
      } else {
        setError('Invalid password.');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-surface-300 bg-white p-8 shadow-sm"
      >
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Deslint Admin</h1>
        </div>

        <label htmlFor="admin-password" className="sr-only">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
        />

        {error && (
          <p className="mt-2 text-sm text-fail">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
