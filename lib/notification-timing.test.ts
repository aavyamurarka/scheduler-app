import { describe, expect, it } from 'vitest';

import { getPreTaskNotificationWindow } from './notification-timing';

describe('getPreTaskNotificationWindow', () => {
  it('targets tasks starting 14–16 minutes from now', () => {
    const now = new Date('2026-07-09T10:00:00.000Z');
    const { windowStart, windowEnd } = getPreTaskNotificationWindow(now);

    expect(windowStart.toISOString()).toBe('2026-07-09T10:14:00.000Z');
    expect(windowEnd.toISOString()).toBe('2026-07-09T10:16:00.000Z');
  });
});
