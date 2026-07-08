'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { syncGoogleCalendarAction } from '@/app/actions/calendar';

type AutoScheduleRefresherProps = {
  isCalendarConnected: boolean;
};

const PERIODIC_SYNC_MS = 2 * 60 * 1000;
const MIN_SYNC_GAP_MS = 20 * 1000;

/**
 * Keeps the day view fresh without a Sync button:
 * - on first mount (app open)
 * - when the tab becomes visible again
 * - when the window is focused / clicked back into
 * - on a quiet periodic interval while the tab is visible
 */
export function AutoScheduleRefresher({ isCalendarConnected }: AutoScheduleRefresherProps) {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const lastSyncAtRef = useRef(0);

  useEffect(() => {
    const refresh = async (force = false) => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      const now = Date.now();
      if (!force && now - lastSyncAtRef.current < MIN_SYNC_GAP_MS) {
        return;
      }

      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      lastSyncAtRef.current = now;

      try {
        if (isCalendarConnected) {
          await syncGoogleCalendarAction();
        } else {
          router.refresh();
        }
      } catch (err) {
        console.error('[Scheduler] Auto schedule refresh failed', err);
      } finally {
        inFlightRef.current = false;
      }
    };

    // Immediate refresh when the app is opened.
    void refresh(true);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh(true);
      }
    };

    const onFocus = () => {
      void refresh();
    };

    const onPointer = () => {
      void refresh();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    // First interaction after idle also refreshes (throttled).
    window.addEventListener('pointerdown', onPointer);

    const intervalId = window.setInterval(() => {
      void refresh();
    }, PERIODIC_SYNC_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pointerdown', onPointer);
      window.clearInterval(intervalId);
    };
  }, [isCalendarConnected, router]);

  return null;
}
