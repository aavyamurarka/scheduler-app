'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    callbackError === 'auth_callback_failed'
      ? 'Sign-in link expired or failed. Please try again.'
      : null
  );
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push('/');
      router.refresh();
      return;
    }

    setMessage('Check your email for a confirmation link, then sign in.');
    setLoading(false);
  }

  return (
    <div className="glass-strong bubble-lg w-full max-w-md p-6 sm:p-8">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-hot)]">
          Scheduler
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
          {isLogin ? 'Welcome back' : 'Create your space'}
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {isLogin
            ? 'Sign in to pick up today’s already-arranged plan.'
            : 'Dump the chaos. We’ll place it around what is fixed.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--ink-muted)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-[var(--ink-muted)]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </div>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        {message && (
          <p className="alert alert-info" role="status">
            {message}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full text-sm">
          {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--ink-muted)]">
        {isLogin ? (
          <>
            No account?{' '}
            <Link href="/signup" className="font-medium text-[var(--accent-hot)] hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-[var(--accent-hot)] hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
