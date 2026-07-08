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
      <p className="alert alert-ok mb-4" role="status">
        Google Calendar connected. Today&apos;s events were imported.
      </p>
    );
  }

  if (status === 'error') {
    return (
      <p className="alert alert-error mb-4" role="alert">
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
    <section className="glass bubble-lg p-4 sm:p-6">
      <Suspense fallback={null}>
        <CalendarStatusBanner />
      </Suspense>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
            Google Calendar
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {isConnected
              ? 'Synced automatically while you use the app. Yesterday’s events drop off each new day.'
              : 'Connect to pull classes and meetings into your schedule.'}
          </p>
          {isConnected && lastSyncedLabel && (
            <p className="mt-2 text-xs text-[var(--ink-faint)]">
              Last synced: {lastSyncedLabel}
            </p>
          )}
        </div>

        {!isConnected ? (
          <a href="/api/google-calendar/connect" className="btn-primary shrink-0 text-sm">
            Connect Google Calendar
          </a>
        ) : (
          <span className="badge badge-accent self-start sm:self-center">Live</span>
        )}
      </div>
    </section>
  );
}
