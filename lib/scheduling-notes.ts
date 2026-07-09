import { getTodayDateParts, wallClockInZoneToDate } from '@/lib/day-bounds';

/** Parsed placement window for a single calendar day. */
export type SchedulingConstraints = {
  notBefore?: Date;
  notAfter?: Date;
};

/** Day-level hint from notes — when to place a pending flexible task. */
export type NotesTargetDay = 'today' | 'tomorrow';

/**
 * Which calendar day the user wants (if stated).
 * null = no preference → schedule into today by default.
 */
export function notesTargetDay(notes: string | null | undefined): NotesTargetDay | null {
  if (!notes?.trim()) return null;

  const text = notes.toLowerCase();

  if (/\b(tomorrow|tmrw|tomorow|next day)\b/.test(text)) {
    return 'tomorrow';
  }

  if (/\b(today|tonight)\b/.test(text)) {
    return 'today';
  }

  return null;
}

const EVENING_START = { hour: 17, minute: 0 };
const AFTERNOON_START = { hour: 12, minute: 0 };
const AFTERNOON_END = { hour: 17, minute: 0 };
const MORNING_END = { hour: 12, minute: 0 };

function wallOnDay(
  dayStart: Date,
  timeZone: string,
  hour: number,
  minute: number
): Date {
  const { year, month, day } = getTodayDateParts(timeZone, dayStart);
  return wallClockInZoneToDate(year, month, day, hour, minute, timeZone);
}

function parseClockTime(text: string): { hour: number; minute: number } | null {
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (minute < 0 || minute > 59) return null;

  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (!meridiem && hour <= 12 && /pm/i.test(text)) {
    // "after 5" with pm elsewhere in phrase
    if (hour < 12) hour += 12;
  }

  if (hour < 0 || hour > 23) return null;
  return { hour, minute };
}

/**
 * Interpret free-text scheduling notes into a same-day time window.
 * Heuristic parser (no external AI) — covers common student phrasing.
 */
export function interpretSchedulingNotes(
  notes: string | null | undefined,
  dayStart: Date,
  dayEnd: Date,
  timeZone: string
): SchedulingConstraints | null {
  if (!notes?.trim()) return null;

  const text = notes.toLowerCase();
  let notBefore: Date | undefined;
  let notAfter: Date | undefined;

  // Day-only phrases are handled by notesTargetDay — not time windows.
  const dayOnly =
    notesTargetDay(notes) !== null &&
    !/\b(morning|afternoon|evening|night|after|before)\b/.test(text);
  if (dayOnly) return null;

  const setNotBefore = (hour: number, minute: number) => {
    const candidate = wallOnDay(dayStart, timeZone, hour, minute);
    if (candidate < dayStart) return;
    if (!notBefore || candidate > notBefore) notBefore = candidate;
  };

  const setNotAfter = (hour: number, minute: number) => {
    const candidate = wallOnDay(dayStart, timeZone, hour, minute);
    if (candidate > dayEnd) return;
    if (!notAfter || candidate < notAfter) notAfter = candidate;
  };

  if (/\b(morning|mornings)\b/.test(text) && !/\b(afternoon|evening)\b/.test(text)) {
    setNotAfter(MORNING_END.hour, MORNING_END.minute);
  }

  if (/\b(afternoon|afternoons)\b/.test(text) && !/\b(evening|morning)\b/.test(text)) {
    setNotBefore(AFTERNOON_START.hour, AFTERNOON_START.minute);
    setNotAfter(AFTERNOON_END.hour, AFTERNOON_END.minute);
  }

  if (/\b(evening|evenings|night|nights)\b/.test(text)) {
    setNotBefore(EVENING_START.hour, EVENING_START.minute);
  }

  if (
    /\b(after uni|after university|back from uni|back from university|when i(?:'m| am) back|when i get home|after class|after classes|after lecture|after lectures)\b/.test(
      text
    )
  ) {
    setNotBefore(EVENING_START.hour, EVENING_START.minute);
  }

  const afterMatch = text.match(
    /\bafter\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i
  );
  if (afterMatch) {
    const parsed = parseClockTime(afterMatch[1]);
    if (parsed) setNotBefore(parsed.hour, parsed.minute);
  }

  const beforeMatch = text.match(
    /\bbefore\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i
  );
  if (beforeMatch) {
    const parsed = parseClockTime(beforeMatch[1]);
    if (parsed) setNotAfter(parsed.hour, parsed.minute);
  }

  if (!notBefore && !notAfter) return null;

  if (notBefore && notAfter && notBefore >= notAfter) {
    return null;
  }

  return { notBefore, notAfter };
}
