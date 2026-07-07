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
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Scheduler</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {isLogin ? 'Sign in to your account' : 'Create your account'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">
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
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {message && (
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800" role="status">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        {isLogin ? (
          <>
            No account?{' '}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
