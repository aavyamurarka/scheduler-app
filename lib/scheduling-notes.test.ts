import { describe, expect, it } from 'vitest';

import { interpretSchedulingNotes } from '@/lib/scheduling-notes';

const DAY = '2026-07-06';
const TZ = 'UTC';

function bounds() {
  const dayStart = new Date(`${DAY}T07:00:00.000Z`);
  const dayEnd = new Date(`${DAY}T23:00:00.000Z`);
  return { dayStart, dayEnd };
}

describe('interpretSchedulingNotes', () => {
  it('returns null for empty notes', () => {
    const { dayStart, dayEnd } = bounds();
    expect(interpretSchedulingNotes('', dayStart, dayEnd, TZ)).toBeNull();
  });

  it('interprets evening-only phrasing', () => {
    const { dayStart, dayEnd } = bounds();
    const result = interpretSchedulingNotes(
      'only in the evening after uni',
      dayStart,
      dayEnd,
      TZ
    );

    expect(result?.notBefore?.toISOString()).toBe('2026-07-06T17:00:00.000Z');
    expect(result?.notAfter).toBeUndefined();
  });

  it('interprets after 5pm', () => {
    const { dayStart, dayEnd } = bounds();
    const result = interpretSchedulingNotes('after 5pm', dayStart, dayEnd, TZ);

    expect(result?.notBefore?.toISOString()).toBe('2026-07-06T17:00:00.000Z');
  });

  it('interprets morning-only phrasing', () => {
    const { dayStart, dayEnd } = bounds();
    const result = interpretSchedulingNotes('mornings only', dayStart, dayEnd, TZ);

    expect(result?.notAfter?.toISOString()).toBe('2026-07-06T12:00:00.000Z');
  });
});
