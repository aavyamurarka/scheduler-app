export type OneSignalSdk = {
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
      addEventListener: (
        event: 'change',
        listener: (event: { current: { id: string | null } }) => void
      ) => void;
      removeEventListener: (
        event: 'change',
        listener: (event: { current: { id: string | null } }) => void
      ) => void;
    };
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(sdk: OneSignalSdk) => void>;
  }
}

export function getOneSignalAppId(): string | null {
  const id = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  return id && id.trim().length > 0 ? id.trim() : null;
}

let oneSignalReadyPromise: Promise<OneSignalSdk> | null = null;

export async function ensureOneSignalReady(): Promise<OneSignalSdk> {
  if (oneSignalReadyPromise) {
    return await oneSignalReadyPromise;
  }

  const appId = getOneSignalAppId();
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

/** OneSignal may return a null id until the browser registers with their backend. */
export function waitForPushSubscriptionId(
  OneSignal: OneSignalSdk,
  timeoutMs = 15000
): Promise<string | null> {
  const existing = OneSignal.User.PushSubscription.id;
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      OneSignal.User.PushSubscription.removeEventListener('change', onChange);
      resolve(OneSignal.User.PushSubscription.id);
    }, timeoutMs);

    const onChange = (event: { current: { id: string | null } }) => {
      if (!event.current.id) {
        return;
      }
      window.clearTimeout(timeoutId);
      OneSignal.User.PushSubscription.removeEventListener('change', onChange);
      resolve(event.current.id);
    };

    OneSignal.User.PushSubscription.addEventListener('change', onChange);
  });
}

export async function enablePushNotifications(): Promise<
  | { success: true; subscriptionId: string }
  | { success: false; error: string }
> {
  const OneSignal = await ensureOneSignalReady();
  await OneSignal.Notifications.requestPermission();

  if (!OneSignal.Notifications.permission) {
    return { success: false, error: 'Notification permission was not granted.' };
  }

  await OneSignal.User.PushSubscription.optIn();
  const id = await waitForPushSubscriptionId(OneSignal);

  if (!id) {
    return {
      success: false,
      error: 'Push subscription id was not available yet. Try again in a moment.',
    };
  }

  return { success: true, subscriptionId: id };
}
