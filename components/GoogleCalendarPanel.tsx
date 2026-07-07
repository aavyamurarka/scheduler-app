'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, useTransition } from 'react';

import { syncGoogleCalendarAction } from '@/app/actions/calendar';

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
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [reshuffleMessage, setReshuffleMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const autoSyncInFlightRef = useRef(false);

  function handleSync() {
    setSyncMessage(null);
    setSyncError(null);
    setReshuffleMessage(null);

    startTransition(async () => {
      const result = await syncGoogleCalendarAction();
      if (result.success) {
        const skippedNote =
          result.skipped > 0 ? ` (${result.skipped} all-day/skipped)` : '';
        setSyncMessage(`Synced ${result.imported} event${result.imported === 1 ? '' : 's'}${skippedNote}.`);
        if (result.notices && result.notices.length > 0) {
          const moved = result.notices.slice(0, 3).map((n) => n.title).join(', ');
          const more = result.notices.length > 3 ? ` +${result.notices.length - 3} more` : '';
          setReshuffleMessage(`Reshuffled: ${moved}${more}.`);
        }
      } else {
        setSyncError(result.error);
      }
    });
  }

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const intervalMs = 4 * 60 * 1000;

    const tick = async () => {
      // Don’t sync in background if tab isn’t visible.
      if (document.visibilityState !== 'visible') {
        return;
      }

      // Avoid overlapping sync calls.
      if (autoSyncInFlightRef.current) {
        return;
      }

      autoSyncInFlightRef.current = true;
      try {
        const result = await syncGoogleCalendarAction();
        // Keep it quiet: only surface errors (and avoid toast spam).
        if (!result.success) {
          setSyncError(result.error);
        }
      } finally {
        autoSyncInFlightRef.current = false;
      }
    };

    // Start a little after page load.
    const timeoutId = window.setTimeout(() => {
      void tick();
    }, 15_000);

    const intervalId = window.setInterval(() => {
      void tick();
    }, intervalMs);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [isConnected]);

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
              ? 'Import today’s timed events as fixed tasks (read-only).'
              : 'Connect to pull classes and meetings into your schedule.'}
          </p>
          {isConnected && lastSyncedLabel && (
            <p className="mt-1 text-xs text-zinc-400">Last synced: {lastSyncedLabel}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {isConnected ? (
            <button
              type="button"
              onClick={handleSync}
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isPending ? 'Syncing…' : 'Sync now'}
            </button>
          ) : (
            <a
              href="/api/google-calendar/connect"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Connect Google Calendar
            </a>
          )}
        </div>
      </div>

      {syncMessage && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
          {syncMessage}
        </p>
      )}

      {syncError && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {syncError}
        </p>
      )}

      {reshuffleMessage && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          {reshuffleMessage}
        </p>
      )}

      <p className="mt-3 text-xs text-zinc-400">
        Setup guide: <code className="text-zinc-500">docs/google-calendar-setup.md</code>
      </p>
    </section>
  );
}
