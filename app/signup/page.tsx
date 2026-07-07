import { Suspense } from 'react';

import { AuthForm } from '@/components/AuthForm';

export default function SignupPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
      <Suspense fallback={<p className="text-sm text-zinc-600">Loading…</p>}>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
