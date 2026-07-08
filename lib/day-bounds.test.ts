import { describe, expect, it } from 'vitest';

import { getCalendarDayBounds, getDayBoundsFromPreferences } from '@/lib/day-bounds';
import type { UserPreferences } from '@/lib/types';

describe('getCalendarDayBounds', () => {
  it('returns midnight-to-midnight in the given timezone', () => {
    const referenceDate = new Date('2026-07-08T12:00:00.000Z');
    const { dayStart, dayEnd } = getCalendarDayBounds('UTC', referenceDate);

    expect(dayStart.toISOString()).toBe('2026-07-08T00:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-07-09T00:00:00.000Z');
  });
});

describe('getDayBoundsFromPreferences', () => {
  it('builds a scheduling window from wake and sleep times', () => {
    const preferences: UserPreferences = {
      user_id: 'user-1',
      wake_time: '07:00:00',
      sleep_time: '23:00:00',
      timezone: 'UTC',
      created_at: '2026-07-06T00:00:00.000Z',
      updated_at: '2026-07-06T00:00:00.000Z',
    };

    const referenceDate = new Date('2026-07-06T12:00:00.000Z');
    const { dayStart, dayEnd } = getDayBoundsFromPreferences(preferences, referenceDate);

    expect(dayStart.toISOString()).toBe('2026-07-06T07:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-07-06T23:00:00.000Z');
  });

  it('rejects sleep time before wake time', () => {
    const preferences: UserPreferences = {
      user_id: 'user-1',
      wake_time: '22:00:00',
      sleep_time: '06:00:00',
      timezone: 'UTC',
      created_at: '2026-07-06T00:00:00.000Z',
      updated_at: '2026-07-06T00:00:00.000Z',
    };

    expect(() => getDayBoundsFromPreferences(preferences)).toThrow(
      'Sleep time must be after wake-up time.'
    );
  });
});
