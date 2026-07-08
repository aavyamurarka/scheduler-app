import type { SupabaseClient } from '@supabase/supabase-js';

import { getDayBoundsFromPreferences, type DayBounds } from '@/lib/day-bounds';
import { getUserPreferences } from '@/lib/preferences';
import { compareSchedules, scheduleDay, type ScheduleChange, type ScheduleDayResult } from '@/lib/scheduler';
import type { Task, UserPreferences } from '@/lib/types';

export function isTaskScheduledToday(
  task: Task,
  dayStart: Date,
  dayEnd: Date
): boolean {
  if (!task.scheduled_start) {
    return false;
  }

  const start = new Date(task.scheduled_start);
  return start >= dayStart && start < dayEnd;
}

export async function requireUserPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferences> {
  const preferences = await getUserPreferences(supabase, userId);

  if (!preferences) {
    throw new Error('User preferences not found');
  }

  return preferences;
}

export async function getSchedulableTasks(
  supabase: SupabaseClient,
  userId: string,
  bounds: DayBounds
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'completed');

  if (error) {
    throw error;
  }

  const { dayStart, dayEnd } = bounds;

  return (data ?? []).filter((task) => {
    if (task.task_type === 'flexible') {
      return true;
    }

    return isTaskScheduledToday(task, dayStart, dayEnd);
  });
}

export function partitionDayView(
  tasks: Task[],
  bounds: DayBounds,
  now: Date = new Date()
): {
  scheduled: Task[];
  unscheduled: Task[];
} {
  const { dayStart, dayEnd } = bounds;

  const scheduled = tasks
    .filter(
      (task) =>
        task.scheduled_start &&
        task.scheduled_end &&
        isTaskScheduledToday(task, dayStart, dayEnd) &&
        // Hide slots that already ended — schedule should show what's left today.
        new Date(task.scheduled_end) > now
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime()
    );

  const unscheduled = tasks.filter(
    (task) =>
      task.task_type === 'flexible' &&
      task.status === 'pending' &&
      !task.scheduled_start
  );

  return { scheduled, unscheduled };
}

export async function runDaySchedule(
  supabase: SupabaseClient,
  userId: string
): Promise<ScheduleDayResult> {
  const preferences = await requireUserPreferences(supabase, userId);
  const bounds = getDayBoundsFromPreferences(preferences);
  const tasks = await getSchedulableTasks(supabase, userId, bounds);
  const { dayStart, dayEnd } = bounds;

  const fixedTasks = tasks
    .filter(
      (task) =>
        task.task_type === 'fixed' &&
        task.scheduled_start &&
        task.scheduled_end
    )
    .map((task) => ({
      id: task.id,
      scheduled_start: task.scheduled_start!,
      scheduled_end: task.scheduled_end!,
    }));

  const flexibleTasks = tasks
    .filter((task) => task.task_type === 'flexible')
    .map((task) => ({
      id: task.id,
      duration_minutes: task.duration_minutes,
      priority: task.priority,
      deadline: task.deadline,
    }));

  const scheduleFrom = new Date();
  const result = scheduleDay(fixedTasks, flexibleTasks, dayStart, dayEnd, scheduleFrom);

  const unscheduledIds = new Set(result.unscheduled);

  const updates = tasks
    .filter((task) => task.task_type === 'flexible')
    .map((task) => {
      const assignment = result.scheduled.find((item) => item.id === task.id);

      if (assignment) {
        return supabase
          .from('tasks')
          .update({
            scheduled_start: assignment.scheduled_start,
            scheduled_end: assignment.scheduled_end,
            status: 'scheduled',
          })
          .eq('id', task.id)
          .eq('user_id', userId);
      }

      if (unscheduledIds.has(task.id)) {
        return supabase
          .from('tasks')
          .update({
            scheduled_start: null,
            scheduled_end: null,
            status: 'pending',
          })
          .eq('id', task.id)
          .eq('user_id', userId);
      }

      return null;
    })
    .filter((update): update is NonNullable<typeof update> => update !== null);

  const responses = await Promise.all(updates);
  const failed = responses.find((response) => response.error);

  if (failed?.error) {
    throw failed.error;
  }

  return result;
}

export type ReshuffleNotice = {
  id: string;
  title: string;
  fromStart: string;
  toStart: string;
};

export type RunDayScheduleWithNoticesResult = {
  result: ScheduleDayResult;
  notices: ReshuffleNotice[];
};

function buildBeforeMap(tasks: Task[]): Map<string, { start: string; end: string }> {
  const before = new Map<string, { start: string; end: string }>();

  for (const task of tasks) {
    if (task.task_type !== 'flexible') continue;
    if (!task.scheduled_start || !task.scheduled_end) continue;

    before.set(task.id, { start: task.scheduled_start, end: task.scheduled_end });
  }

  return before;
}

function toReshuffleNotices(changes: ScheduleChange[], tasks: Task[]): ReshuffleNotice[] {
  const titleById = new Map(tasks.map((t) => [t.id, t.title]));

  return changes.map((change) => ({
    id: change.id,
    title: titleById.get(change.id) ?? 'Task',
    fromStart: change.previousStart,
    toStart: change.newStart,
  }));
}

export async function runDayScheduleWithNotices(
  supabase: SupabaseClient,
  userId: string
): Promise<RunDayScheduleWithNoticesResult> {
  const preferences = await requireUserPreferences(supabase, userId);
  const bounds = getDayBoundsFromPreferences(preferences);
  const tasks = await getSchedulableTasks(supabase, userId, bounds);
  const before = buildBeforeMap(tasks);

  const { dayStart, dayEnd } = bounds;

  const fixedTasks = tasks
    .filter(
      (task) =>
        task.task_type === 'fixed' &&
        task.scheduled_start &&
        task.scheduled_end
    )
    .map((task) => ({
      id: task.id,
      scheduled_start: task.scheduled_start!,
      scheduled_end: task.scheduled_end!,
    }));

  const flexibleTasks = tasks
    .filter((task) => task.task_type === 'flexible')
    .map((task) => ({
      id: task.id,
      duration_minutes: task.duration_minutes,
      priority: task.priority,
      deadline: task.deadline,
    }));

  const scheduleFrom = new Date();
  const result = scheduleDay(fixedTasks, flexibleTasks, dayStart, dayEnd, scheduleFrom);

  const changes = compareSchedules(before, result.scheduled);
  const notices = toReshuffleNotices(changes, tasks);

  const unscheduledIds = new Set(result.unscheduled);

  const updates = tasks
    .filter((task) => task.task_type === 'flexible')
    .map((task) => {
      const assignment = result.scheduled.find((item) => item.id === task.id);

      if (assignment) {
        return supabase
          .from('tasks')
          .update({
            scheduled_start: assignment.scheduled_start,
            scheduled_end: assignment.scheduled_end,
            status: 'scheduled',
          })
          .eq('id', task.id)
          .eq('user_id', userId);
      }

      if (unscheduledIds.has(task.id)) {
        return supabase
          .from('tasks')
          .update({
            scheduled_start: null,
            scheduled_end: null,
            status: 'pending',
          })
          .eq('id', task.id)
          .eq('user_id', userId);
      }

      return null;
    })
    .filter((update): update is NonNullable<typeof update> => update !== null);

  const responses = await Promise.all(updates);
  const failed = responses.find((response) => response.error);

  if (failed?.error) {
    throw failed.error;
  }

  return { result, notices };
}
