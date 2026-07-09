'use client';

import { useState } from 'react';

import { savePushSubscriptionAction } from '@/app/actions/push';
import { enablePushNotifications, getOneSignalAppId } from '@/lib/onesignal-client';

export function EnableNotificationsButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  if (!getOneSignalAppId()) {
    return null;
  }

  async function handleEnable() {
    setStatus('loading');
    setMessage(null);

    try {
      const result = await enablePushNotifications();
      if (!result.success) {
        setStatus('error');
        setMessage(result.error);
        return;
      }

      const saved = await savePushSubscriptionAction(result.subscriptionId);
      if (!saved.success) {
        setStatus('error');
        setMessage(saved.error);
        return;
      }

      localStorage.setItem('scheduler_push_prompted', '1');
      setStatus('done');
      setMessage('Notifications enabled for this browser.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Could not enable notifications.');
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
      <h2 className="font-display text-sm font-semibold text-[var(--ink)]">Push notifications</h2>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        Get a reminder 15 minutes before each scheduled task.
      </p>
      <button
        type="button"
        className="btn-primary mt-3 text-xs"
        onClick={() => void handleEnable()}
        disabled={status === 'loading' || status === 'done'}
      >
        {status === 'loading'
          ? 'Enabling…'
          : status === 'done'
            ? 'Enabled'
            : 'Enable notifications'}
      </button>
      {message ? (
        <p
          className={`mt-2 text-xs ${status === 'error' ? 'text-[var(--danger)]' : 'text-[var(--ink-muted)]'}`}
          role={status === 'error' ? 'alert' : undefined}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
