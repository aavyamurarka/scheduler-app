import { Suspense } from 'react';

import { AuthForm } from '@/components/AuthForm';

export default function SignupPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-12">
      <Suspense fallback={<p className="text-sm text-[var(--ink-muted)]">Loading…</p>}>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
