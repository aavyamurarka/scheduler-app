'use client';

import { useState } from 'react';

import { savePushSubscriptionAction } from '@/app/actions/push';
import { enablePushNotifications, getOneSignalAppId } from '@/lib/onesignal-client';

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function EnableNotificationsButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  if (!getOneSignalAppId()) {
    return null;
  }

  async function handleEnable() {
    setStatus('loading');
    setMessage(null);

    if (isIos() && !isStandalonePwa()) {
      setStatus('error');
      setMessage(
        'On iPhone, add Scheduler to your Home Screen first (Safari → Share → Add to Home Screen), then open the app from that icon and enable notifications here.'
      );
      return;
    }

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
      setMessage(
        isAndroid()
          ? 'Notifications enabled. Keep Chrome open or in the background to receive reminders.'
          : 'Notifications enabled for this device.'
      );
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

      <div className="mt-3 space-y-2 rounded-lg bg-white/50 p-3 text-xs text-[var(--ink-muted)]">
        <p className="font-medium text-[var(--ink)]">Mobile setup</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <strong>Android:</strong> open in Chrome, tap Enable below, allow notifications.
          </li>
          <li>
            <strong>iPhone:</strong> Safari → Share → Add to Home Screen → open from Home Screen →
            Enable below.
          </li>
          <li>Desktop browsers work too (Chrome, Edge, Firefox).</li>
        </ul>
      </div>

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
