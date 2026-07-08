import { Suspense } from 'react';

import { AuthForm } from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        className="ambient-orb -right-10 top-16 h-52 w-52 bg-[radial-gradient(circle,rgba(224,138,79,0.4),transparent_70%)]"
        aria-hidden
      />
      <div
        className="ambient-orb -left-8 bottom-10 h-48 w-48 bg-[radial-gradient(circle,rgba(90,140,180,0.25),transparent_70%)]"
        aria-hidden
      />
      <Suspense fallback={<p className="text-sm text-[var(--ink-muted)]">Loading…</p>}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
