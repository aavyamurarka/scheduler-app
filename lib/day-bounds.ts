import type { UserPreferences } from '@/lib/types';

export type DayBounds = {
  dayStart: Date;
  dayEnd: Date;
};

export function parseTimeParts(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid time: ${time}`);
  }

  return { hours, minutes };
}

export function getTodayDateParts(
  timeZone: string,
  referenceDate: Date = new Date()
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(referenceDate);

  return {
    year: Number(parts.find((part) => part.type === 'year')!.value),
    month: Number(parts.find((part) => part.type === 'month')!.value),
    day: Number(parts.find((part) => part.type === 'day')!.value),
  };
}

/** Shift a calendar date by `days` in `timeZone`, returning a Date near noon UTC that day. */
export function addCalendarDays(
  timeZone: string,
  referenceDate: Date,
  days: number
): Date {
  const { year, month, day } = getTodayDateParts(timeZone, referenceDate);
  const next = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return next;
}

/** Converts a wall-clock time on a calendar date in `timeZone` to a UTC Date. */
export function wallClockInZoneToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  let ms = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const candidate = new Date(ms);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(candidate);

    const actualYear = Number(parts.find((part) => part.type === 'year')!.value);
    const actualMonth = Number(parts.find((part) => part.type === 'month')!.value);
    const actualDay = Number(parts.find((part) => part.type === 'day')!.value);
    let actualHour = Number(parts.find((part) => part.type === 'hour')!.value);
    const actualMinute = Number(parts.find((part) => part.type === 'minute')!.value);

    if (actualHour === 24) {
      actualHour = 0;
    }

    const diffMinutes =
      (year - actualYear) * 525_600 +
      (month - actualMonth) * 43_200 +
      (day - actualDay) * 1_440 +
      (hour - actualHour) * 60 +
      (minute - actualMinute);

    if (diffMinutes === 0) {
      return candidate;
    }

    ms += diffMinutes * 60 * 1000;
  }

  return new Date(ms);
}

/** Midnight → next midnight in the user's timezone (for calendar import day). */
export function getCalendarDayBounds(
  timeZone: string,
  referenceDate: Date = new Date()
): DayBounds {
  const { year, month, day } = getTodayDateParts(timeZone, referenceDate);
  const dayStart = wallClockInZoneToDate(year, month, day, 0, 0, timeZone);

  // Calendar-day arithmetic in UTC date parts (safe for month/year rollover).
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const dayEnd = wallClockInZoneToDate(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    0,
    0,
    timeZone
  );

  return { dayStart, dayEnd };
}

export function getDayBoundsFromPreferences(
  preferences: UserPreferences,
  referenceDate: Date = new Date()
): DayBounds {
  const { year, month, day } = getTodayDateParts(preferences.timezone, referenceDate);
  const wake = parseTimeParts(preferences.wake_time);
  const sleep = parseTimeParts(preferences.sleep_time);

  const dayStart = wallClockInZoneToDate(
    year,
    month,
    day,
    wake.hours,
    wake.minutes,
    preferences.timezone
  );

  const dayEnd = wallClockInZoneToDate(
    year,
    month,
    day,
    sleep.hours,
    sleep.minutes,
    preferences.timezone
  );

  if (dayEnd <= dayStart) {
    throw new Error('Sleep time must be after wake-up time.');
  }

  return { dayStart, dayEnd };
}
