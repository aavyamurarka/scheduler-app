'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { syncGoogleCalendarAction } from '@/app/actions/calendar';

type AutoScheduleRefresherProps = {
  isCalendarConnected: boolean;
};

const PERIODIC_SYNC_MS = 2 * 60 * 1000;
const MIN_SYNC_GAP_MS = 45 * 1000;

/**
 * Quietly refreshes calendar/schedule:
 * - once shortly after open
 * - when the tab becomes visible again
 * - on a slow interval while visible
 *
 * Intentionally avoids pointer/focus spam so drag interactions stay smooth.
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

      if (document.body.dataset.timelineDragging === '1') {
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

    const timeoutId = window.setTimeout(() => {
      void refresh(true);
    }, 2500);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh(true);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    const intervalId = window.setInterval(() => {
      void refresh();
    }, PERIODIC_SYNC_MS);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  }, [isCalendarConnected, router]);

  return null;
}
