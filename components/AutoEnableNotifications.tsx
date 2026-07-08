'use client';

import { useEffect, useRef } from 'react';

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

/**
 * Silently requests notification permission once per browser profile.
 * Falls back to first pointer interaction if the browser requires a gesture.
 */
export function AutoEnableNotifications() {
  const attemptedRef = useRef(false);

  useEffect(() => {
    const appId = getAppId();
    if (!appId || typeof window === 'undefined') {
      return;
    }

    if (localStorage.getItem('scheduler_push_prompted') === '1') {
      return;
    }

    async function enable() {
      if (attemptedRef.current) {
        return;
      }
      attemptedRef.current = true;

      try {
        const OneSignal = await ensureOneSignalReady();
        await OneSignal.Notifications.requestPermission();
        await OneSignal.User.PushSubscription.optIn();

        const id = OneSignal.User.PushSubscription.id;
        if (id) {
          await savePushSubscriptionAction(id);
        }
      } catch (err) {
        console.error('[Scheduler] Auto notification enable failed', err);
      } finally {
        localStorage.setItem('scheduler_push_prompted', '1');
      }
    }

    // Prefer a quiet prompt shortly after load.
    const timeoutId = window.setTimeout(() => {
      void enable();
    }, 1200);

    // Some browsers require a gesture — retry on first interaction.
    const onInteract = () => {
      void enable();
    };
    window.addEventListener('pointerdown', onInteract, { once: true });

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('pointerdown', onInteract);
    };
  }, []);

  return null;
}
