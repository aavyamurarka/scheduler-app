'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

type GoogleCalendarPanelProps = {
  isConnected: boolean;
  lastSyncedAt: string | null;
};

function CalendarStatusBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get('calendar');
  const message = searchParams.get('message');

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => router.replace('/', { scroll: false }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  if (!status) {
    return null;
  }

  if (status === 'connected') {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
        Google Calendar connected. Today&apos;s events were imported.
      </p>
    );
  }

  if (status === 'error') {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
        Calendar error: {message ?? 'Something went wrong'}
      </p>
    );
  }

  return null;
}

export function GoogleCalendarPanel({
  isConnected,
  lastSyncedAt,
}: GoogleCalendarPanelProps) {
  const lastSyncedLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6">
      <Suspense fallback={null}>
        <CalendarStatusBanner />
      </Suspense>

      <div className="mt-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Google Calendar</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {isConnected
              ? 'Synced automatically while you use the app. Yesterday’s events drop off each new day.'
              : 'Connect to pull classes and meetings into your schedule.'}
          </p>
          {isConnected && lastSyncedLabel && (
            <p className="mt-1 text-xs text-zinc-400">Last synced: {lastSyncedLabel}</p>
          )}
        </div>

        {!isConnected && (
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/google-calendar/connect"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Connect Google Calendar
            </a>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Setup guide: <code className="text-zinc-500">docs/google-calendar-setup.md</code>
      </p>
    </section>
  );
}
