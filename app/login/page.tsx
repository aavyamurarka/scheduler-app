import { Suspense } from 'react';

import { AuthForm } from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<p className="text-sm text-[var(--ink-muted)]">Loading…</p>}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
