export type TimeSlot = {
  start: Date;
  end: Date;
};

export type SchedulerFixedTask = {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
};

export type SchedulerFlexibleTask = {
  id: string;
  duration_minutes: number;
  priority: number | null;
  deadline: string | null;
  /** Optional same-day placement window from scheduling notes. */
  constraints?: {
    notBefore?: Date;
    notAfter?: Date;
  } | null;
};

export type ScheduledAssignment = {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
};

export type ScheduleDayResult = {
  scheduled: ScheduledAssignment[];
  unscheduled: string[];
};

export type ScheduleChange = {
  id: string;
  previousStart: string;
  previousEnd: string;
  newStart: string;
  newEnd: string;
};

const DEFAULT_DAY_START_HOUR = 8;
const DEFAULT_DAY_END_HOUR = 23;

export function getDefaultDayBounds(referenceDate: Date = new Date()): {
  dayStart: Date;
  dayEnd: Date;
} {
  const dayStart = new Date(referenceDate);
  dayStart.setHours(DEFAULT_DAY_START_HOUR, 0, 0, 0);

  const dayEnd = new Date(referenceDate);
  dayEnd.setHours(DEFAULT_DAY_END_HOUR, 0, 0, 0);

  return { dayStart, dayEnd };
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function gapDurationMinutes(gap: TimeSlot): number {
  return Math.floor((gap.end.getTime() - gap.start.getTime()) / (60 * 1000));
}

function toFixedBlocks(fixedTasks: SchedulerFixedTask[]): TimeSlot[] {
  return fixedTasks
    .map((task) => ({
      start: new Date(task.scheduled_start),
      end: new Date(task.scheduled_end),
    }))
    .filter((block) => block.end > block.start);
}

function mergeOverlappingBlocks(blocks: TimeSlot[]): TimeSlot[] {
  if (blocks.length === 0) {
    return [];
  }

  const sorted = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: TimeSlot[] = [{ start: sorted[0].start, end: sorted[0].end }];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      if (current.end > last.end) {
        last.end = current.end;
      }
    } else {
      merged.push({ start: current.start, end: current.end });
    }
  }

  return merged;
}

export function computeFreeGaps(
  fixedTasks: SchedulerFixedTask[],
  dayStart: Date,
  dayEnd: Date
): TimeSlot[] {
  const blocks = mergeOverlappingBlocks(toFixedBlocks(fixedTasks));
  const gaps: TimeSlot[] = [];
  let cursor = dayStart;

  for (const block of blocks) {
    const blockStart = block.start < dayStart ? dayStart : block.start;
    const blockEnd = block.end > dayEnd ? dayEnd : block.end;

    if (blockEnd <= dayStart || blockStart >= dayEnd) {
      continue;
    }

    if (blockStart > cursor) {
      gaps.push({ start: new Date(cursor), end: new Date(blockStart) });
    }

    if (blockEnd > cursor) {
      cursor = blockEnd;
    }
  }

  if (cursor < dayEnd) {
    gaps.push({ start: new Date(cursor), end: new Date(dayEnd) });
  }

  return gaps.filter((gap) => gap.end > gap.start);
}

function sortFlexibleTasks(tasks: SchedulerFlexibleTask[]): SchedulerFlexibleTask[] {
  return [...tasks].sort((a, b) => {
    const priorityA = a.priority ?? 3;
    const priorityB = b.priority ?? 3;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
    const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;

    return deadlineA - deadlineB;
  });
}

function fitsInGap(
  gap: TimeSlot,
  durationMinutes: number,
  deadline: string | null,
  dayEnd: Date,
  constraints?: SchedulerFlexibleTask['constraints']
): boolean {
  return findPlacementInGap(gap, durationMinutes, deadline, dayEnd, constraints) !== null;
}

function findPlacementInGap(
  gap: TimeSlot,
  durationMinutes: number,
  deadline: string | null,
  dayEnd: Date,
  constraints?: SchedulerFlexibleTask['constraints']
): Date | null {
  const effectiveDeadline = deadline ? new Date(deadline) : dayEnd;
  let earliest = gap.start;
  let latestEnd = new Date(Math.min(gap.end.getTime(), effectiveDeadline.getTime()));

  if (constraints?.notBefore && constraints.notBefore > earliest) {
    earliest = constraints.notBefore;
  }
  if (constraints?.notAfter && constraints.notAfter < latestEnd) {
    latestEnd = constraints.notAfter;
  }

  const durationMs = durationMinutes * 60 * 1000;
  const latestStart = new Date(latestEnd.getTime() - durationMs);

  if (latestStart < earliest) {
    return null;
  }

  if (gapDurationMinutes({ start: earliest, end: latestEnd }) < durationMinutes) {
    return null;
  }

  return new Date(earliest);
}

function findGapIndex(
  gaps: TimeSlot[],
  task: SchedulerFlexibleTask,
  dayEnd: Date
): number {
  return gaps.findIndex((gap) =>
    fitsInGap(gap, task.duration_minutes, task.deadline, dayEnd, task.constraints)
  );
}

export function scheduleDay(
  fixedTasks: SchedulerFixedTask[],
  flexibleTasks: SchedulerFlexibleTask[],
  dayStart: Date,
  dayEnd: Date,
  /** Earliest moment flexible tasks may start (defaults to dayStart). Use "now" mid-day. */
  scheduleFrom: Date = dayStart
): ScheduleDayResult {
  const effectiveStart =
    scheduleFrom.getTime() > dayStart.getTime() ? scheduleFrom : dayStart;

  if (effectiveStart >= dayEnd) {
    return {
      scheduled: [],
      unscheduled: flexibleTasks.map((task) => task.id),
    };
  }

  const gaps = computeFreeGaps(fixedTasks, effectiveStart, dayEnd);
  const sortedFlexible = sortFlexibleTasks(flexibleTasks);

  const scheduled: ScheduledAssignment[] = [];
  const unscheduled: string[] = [];

  for (const task of sortedFlexible) {
    const gapIndex = findGapIndex(gaps, task, dayEnd);

    if (gapIndex === -1) {
      unscheduled.push(task.id);
      continue;
    }

    const gap = gaps[gapIndex];
    const scheduledStart = findPlacementInGap(
      gap,
      task.duration_minutes,
      task.deadline,
      dayEnd,
      task.constraints
    );

    if (!scheduledStart) {
      unscheduled.push(task.id);
      continue;
    }

    const scheduledEnd = addMinutes(scheduledStart, task.duration_minutes);

    scheduled.push({
      id: task.id,
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
    });

    gap.start = scheduledEnd;
  }

  return { scheduled, unscheduled };
}

export function compareSchedules(
  before: Map<string, { start: string; end: string }>,
  after: ScheduledAssignment[]
): ScheduleChange[] {
  const changes: ScheduleChange[] = [];

  for (const assignment of after) {
    const previous = before.get(assignment.id);

    if (!previous) {
      continue;
    }

    if (
      previous.start !== assignment.scheduled_start ||
      previous.end !== assignment.scheduled_end
    ) {
      changes.push({
        id: assignment.id,
        previousStart: previous.start,
        previousEnd: previous.end,
        newStart: assignment.scheduled_start,
        newEnd: assignment.scheduled_end,
      });
    }
  }

  return changes;
}
