'use client';

import { useEffect, useRef } from 'react';

import { savePushSubscriptionAction } from '@/app/actions/push';
import { enablePushNotifications, getOneSignalAppId } from '@/lib/onesignal-client';

/**
 * Silently requests notification permission once per browser profile.
 * Falls back to first pointer interaction if the browser requires a gesture.
 */
export function AutoEnableNotifications() {
  const attemptedRef = useRef(false);

  useEffect(() => {
    const appId = getOneSignalAppId();
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
        const result = await enablePushNotifications();
        if (!result.success) {
          console.warn('[Scheduler] Auto notification enable skipped:', result.error);
          return;
        }

        const saved = await savePushSubscriptionAction(result.subscriptionId);
        if (saved.success) {
          localStorage.setItem('scheduler_push_prompted', '1');
        } else {
          console.error('[Scheduler] Saving push subscription failed', saved.error);
        }
      } catch (err) {
        console.error('[Scheduler] Auto notification enable failed', err);
      }
    }

    const timeoutId = window.setTimeout(() => {
      void enable();
    }, 1200);

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
