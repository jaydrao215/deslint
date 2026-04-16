'use client';

import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-surface-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-surface-200"
    >
      Sign out
    </button>
  );
}
