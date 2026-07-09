import { describe, expect, it } from 'vitest';

import {
  computeFreeGaps,
  compareSchedules,
  scheduleDay,
  type SchedulerFixedTask,
  type SchedulerFlexibleTask,
} from '@/lib/scheduler';

function at(baseDate: string, hour: number, minute = 0): Date {
  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function iso(baseDate: string, hour: number, minute = 0): string {
  return at(baseDate, hour, minute).toISOString();
}

const DAY = '2026-07-06';

describe('computeFreeGaps', () => {
  it('returns one full gap when there are no fixed tasks', () => {
    const dayStart = at(DAY, 8);
    const dayEnd = at(DAY, 23);

    const gaps = computeFreeGaps([], dayStart, dayEnd);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].start).toEqual(dayStart);
    expect(gaps[0].end).toEqual(dayEnd);
  });

  it('splits gaps around fixed blocks', () => {
    const fixed: SchedulerFixedTask[] = [
      {
        id: 'class',
        scheduled_start: iso(DAY, 9),
        scheduled_end: iso(DAY, 10),
      },
    ];

    const gaps = computeFreeGaps(fixed, at(DAY, 8), at(DAY, 23));

    expect(gaps).toHaveLength(2);
    expect(gaps[0].start).toEqual(at(DAY, 8));
    expect(gaps[0].end).toEqual(at(DAY, 9));
    expect(gaps[1].start).toEqual(at(DAY, 10));
    expect(gaps[1].end).toEqual(at(DAY, 23));
  });
});

describe('scheduleDay', () => {
  const dayStart = at(DAY, 8);
  const dayEnd = at(DAY, 23);

  it('places flexible tasks into free gaps', () => {
    const fixed: SchedulerFixedTask[] = [
      {
        id: 'class',
        scheduled_start: iso(DAY, 9),
        scheduled_end: iso(DAY, 10),
      },
    ];

    const flexible: SchedulerFlexibleTask[] = [
      { id: 'groceries', duration_minutes: 30, priority: 1, deadline: null },
    ];

    const result = scheduleDay(fixed, flexible, dayStart, dayEnd);

    expect(result.unscheduled).toEqual([]);
    expect(result.scheduled).toHaveLength(1);
    expect(new Date(result.scheduled[0].scheduled_start)).toEqual(at(DAY, 8));
    expect(new Date(result.scheduled[0].scheduled_end)).toEqual(at(DAY, 8, 30));
  });

  it('respects scheduling notes constraints (evening only)', () => {
    const flexible: SchedulerFlexibleTask[] = [
      {
        id: 'emails',
        duration_minutes: 30,
        priority: 2,
        deadline: null,
        constraints: {
          notBefore: at(DAY, 17),
        },
      },
    ];

    const result = scheduleDay([], flexible, dayStart, dayEnd);

    expect(result.unscheduled).toEqual([]);
    expect(new Date(result.scheduled[0].scheduled_start)).toEqual(at(DAY, 17));
    expect(new Date(result.scheduled[0].scheduled_end)).toEqual(at(DAY, 17, 30));
  });

  it('schedules higher priority tasks first', () => {
    const flexible: SchedulerFlexibleTask[] = [
      { id: 'low', duration_minutes: 60, priority: 4, deadline: null },
      { id: 'high', duration_minutes: 60, priority: 1, deadline: null },
    ];

    const result = scheduleDay([], flexible, dayStart, dayEnd);

    expect(result.scheduled[0].id).toBe('high');
    expect(result.scheduled[1].id).toBe('low');
  });

  it('breaks ties by sooner deadline', () => {
    const flexible: SchedulerFlexibleTask[] = [
      {
        id: 'later',
        duration_minutes: 30,
        priority: 2,
        deadline: iso(DAY, 18),
      },
      {
        id: 'sooner',
        duration_minutes: 30,
        priority: 2,
        deadline: iso(DAY, 12),
      },
    ];

    const result = scheduleDay([], flexible, dayStart, dayEnd);

    expect(result.scheduled[0].id).toBe('sooner');
    expect(result.scheduled[1].id).toBe('later');
  });

  it('marks tasks unscheduled when no gap fits', () => {
    const fixed: SchedulerFixedTask[] = [
      {
        id: 'block',
        scheduled_start: iso(DAY, 8),
        scheduled_end: iso(DAY, 23),
      },
    ];

    const flexible: SchedulerFlexibleTask[] = [
      { id: 'task', duration_minutes: 60, priority: 1, deadline: null },
    ];

    const result = scheduleDay(fixed, flexible, dayStart, dayEnd);

    expect(result.scheduled).toEqual([]);
    expect(result.unscheduled).toEqual(['task']);
  });

  it('marks tasks unscheduled when they cannot finish before deadline', () => {
    const flexible: SchedulerFlexibleTask[] = [
      {
        id: 'urgent',
        duration_minutes: 120,
        priority: 1,
        deadline: iso(DAY, 9),
      },
    ];

    const result = scheduleDay([], flexible, dayStart, dayEnd);

    expect(result.scheduled).toEqual([]);
    expect(result.unscheduled).toEqual(['urgent']);
  });

  it('does not modify fixed tasks', () => {
    const fixed: SchedulerFixedTask[] = [
      {
        id: 'class',
        scheduled_start: iso(DAY, 9),
        scheduled_end: iso(DAY, 10),
      },
    ];

    const flexible: SchedulerFlexibleTask[] = [
      { id: 'email', duration_minutes: 15, priority: 2, deadline: null },
    ];

    const result = scheduleDay(fixed, flexible, dayStart, dayEnd);

    expect(result.scheduled.every((task) => task.id !== 'class')).toBe(true);
  });

  it('does not place flexible tasks before scheduleFrom (e.g. mid-day now)', () => {
    const flexible: SchedulerFlexibleTask[] = [
      { id: 'later', duration_minutes: 30, priority: 1, deadline: null },
    ];

    const result = scheduleDay([], flexible, dayStart, dayEnd, at(DAY, 15));

    expect(result.unscheduled).toEqual([]);
    expect(new Date(result.scheduled[0].scheduled_start)).toEqual(at(DAY, 15));
  });

  it('leaves gaps carved by locked blocker tasks for free placement', () => {
    const blockers: SchedulerFixedTask[] = [
      {
        id: 'locked-flexible',
        scheduled_start: iso(DAY, 10),
        scheduled_end: iso(DAY, 11),
      },
    ];
    const flexible: SchedulerFlexibleTask[] = [
      { id: 'after', duration_minutes: 30, priority: 1, deadline: null },
    ];

    const result = scheduleDay(blockers, flexible, dayStart, dayEnd, at(DAY, 8));
    expect(result.unscheduled).toEqual([]);
    expect(new Date(result.scheduled[0].scheduled_start)).toEqual(at(DAY, 8));
    expect(new Date(result.scheduled[0].scheduled_end)).toEqual(at(DAY, 8, 30));

    const later = scheduleDay(blockers, flexible, dayStart, dayEnd, at(DAY, 10, 30));
    expect(new Date(later.scheduled[0].scheduled_start)).toEqual(at(DAY, 11));
  });
});

describe('compareSchedules', () => {
  it('detects moved tasks', () => {
    const before = new Map([
      ['groceries', { start: iso(DAY, 11), end: iso(DAY, 11, 30) }],
    ]);

    const after = [
      {
        id: 'groceries',
        scheduled_start: iso(DAY, 14),
        scheduled_end: iso(DAY, 14, 30),
      },
    ];

    const changes = compareSchedules(before, after);

    expect(changes).toHaveLength(1);
    expect(changes[0].newStart).toBe(iso(DAY, 14));
  });
});
