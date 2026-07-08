'use client';

import { useState } from 'react';

import { savePushSubscriptionAction } from '@/app/actions/push';

type OneSignalSdk = {
  init: (opts: {
    appId: string;
    allowLocalhostAsSecureOrigin?: boolean;
    serviceWorkerPath?: string;
    serviceWorkerParam?: { scope: string };
  }) => Promise<void>;
  Notifications: {
    permission: boolean;
    requestPermission: () => Promise<void>;
  };
  User: {
    PushSubscription: {
      optIn: () => Promise<void>;
      id: string | null;
    };
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(sdk: OneSignalSdk) => void>;
  }
}

function getAppId(): string | null {
  const id = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  return id && id.trim().length > 0 ? id.trim() : null;
}

let oneSignalReadyPromise: Promise<OneSignalSdk> | null = null;

async function ensureOneSignalReady(): Promise<OneSignalSdk> {
  if (oneSignalReadyPromise) {
    return await oneSignalReadyPromise;
  }

  const appId = getAppId();
  if (!appId) {
    throw new Error('NEXT_PUBLIC_ONESIGNAL_APP_ID is not set.');
  }

  window.OneSignalDeferred = window.OneSignalDeferred || [];

  oneSignalReadyPromise = new Promise<OneSignalSdk>((resolve, reject) => {
    window.OneSignalDeferred!.push(async (OneSignal) => {
      try {
        try {
          await OneSignal.init({
            appId,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: 'OneSignalSDKWorker.js',
            serviceWorkerParam: { scope: '/' },
          });
        } catch (e) {
          // OneSignal throws if init() is called more than once; treat that as success.
          const message = e instanceof Error ? e.message : String(e);
          if (!message.toLowerCase().includes('already initialized')) {
            throw e;
          }
        }
        resolve(OneSignal);
      } catch (e) {
        oneSignalReadyPromise = null;
        reject(e);
      }
    });
  });

  return await oneSignalReadyPromise;
}

export function PushNotificationsPanel() {
  const appId = getAppId();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (!appId) {
        throw new Error(
          'OneSignal is not configured. Set NEXT_PUBLIC_ONESIGNAL_APP_ID in .env.local.'
        );
      }

      const OneSignal = await ensureOneSignalReady();

      await OneSignal.Notifications.requestPermission();
      await OneSignal.User.PushSubscription.optIn();

      const id = OneSignal.User.PushSubscription.id;
      if (!id) {
        throw new Error('Could not get OneSignal subscription id after opt-in.');
      }

      const result = await savePushSubscriptionAction(id);
      if (!result.success) {
        throw new Error(result.error);
      }

      setMessage('Notifications enabled.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to enable notifications.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass bubble-lg p-4 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-[var(--ink)]">Notifications</h2>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        Get a push 15 minutes before a scheduled task starts.
      </p>

      {!appId ? (
        <p className="alert alert-warn mt-3">
          Set <code className="font-mono text-[0.8rem]">NEXT_PUBLIC_ONESIGNAL_APP_ID</code> to
          enable this.
        </p>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading || !appId}
          className="btn-primary text-sm"
        >
          {loading ? 'Enabling…' : 'Enable notifications'}
        </button>
      </div>

      {message ? (
        <p className="alert alert-ok mt-3" role="status">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="alert alert-error mt-3" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
