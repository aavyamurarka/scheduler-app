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

      // Triggers the browser prompt if needed.
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
    <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6">
      <h2 className="text-base font-semibold text-zinc-900">Notifications</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Get a push notification 15 minutes before a scheduled task starts.
      </p>

      {!appId ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Set <code className="font-mono">NEXT_PUBLIC_ONESIGNAL_APP_ID</code> in{' '}
          <code className="font-mono">.env.local</code> to enable this.
        </p>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading || !appId}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Enabling…' : 'Enable notifications'}
        </button>
      </div>

      {message ? (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

