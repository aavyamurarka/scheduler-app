'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createTask, deleteTask } from '@/lib/tasks';
import { addCalendarDays, getDayBoundsFromPreferences } from '@/lib/day-bounds';
import {
  getSchedulableTasks,
  requireUserPreferences,
  runDayScheduleWithNotices,
  validateFlexiblePlacement,
  type ReshuffleNotice,
} from '@/lib/schedule-service';
import type { TaskType } from '@/lib/types';

export type CreateTaskResult =
  | { success: true; notices?: ReshuffleNotice[] }
  | { success: false; error: string };

export type MoveTaskResult =
  | { success: true }
  | { success: false; error: string };

export type DeleteTaskResult = MoveTaskResult;

export type RescheduleTaskResult = MoveTaskResult;

function parseOptionalString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }
  return value;
}

export async function createTaskAction(
  _prevState: CreateTaskResult | null,
  formData: FormData
): Promise<CreateTaskResult> {
  const title = formData.get('title');
  const taskType = formData.get('task_type');
  const duration = formData.get('duration_minutes');

  if (typeof title !== 'string' || !title.trim()) {
    return { success: false, error: 'Please enter a task title.' };
  }

  if (taskType !== 'fixed' && taskType !== 'flexible') {
    return { success: false, error: 'Please select a task type.' };
  }

  const durationMinutes = Number(duration);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { success: false, error: 'Duration must be a positive number.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in to add tasks.' };
  }

  const newTask: Parameters<typeof createTask>[2] = {
    title,
    task_type: taskType as TaskType,
    duration_minutes: durationMinutes,
    notes: parseOptionalString(formData.get('notes')) ?? null,
  };

  if (taskType === 'fixed') {
    const scheduledStart = parseOptionalString(formData.get('scheduled_start'));
    if (!scheduledStart) {
      return { success: false, error: 'Please set a start time for fixed tasks.' };
    }
    newTask.scheduled_start = scheduledStart;
  } else {
    const priority = Number(formData.get('priority'));
    if (!Number.isFinite(priority) || priority < 1 || priority > 5) {
      return { success: false, error: 'Please select a priority from 1 to 5.' };
    }
    newTask.priority = priority;
    newTask.deadline = parseOptionalString(formData.get('deadline'));
  }

  try {
    await createTask(supabase, user.id, newTask);
    const preferences = await requireUserPreferences(supabase, user.id);
    const { notices } = await runDayScheduleWithNotices(supabase, user.id);
    const tomorrowRef = addCalendarDays(preferences.timezone, new Date(), 1);
    await runDayScheduleWithNotices(supabase, user.id, tomorrowRef);

    revalidatePath('/');
    return { success: true, notices };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add task.';
    return { success: false, error: message };
  }
}

export async function moveFlexibleTaskAction(args: {
  taskId: string;
  scheduledStartIso: string;
}): Promise<MoveTaskResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  const proposedStart = new Date(args.scheduledStartIso);
  if (Number.isNaN(proposedStart.getTime())) {
    return { success: false, error: 'Invalid start time.' };
  }

  try {
    const preferences = await requireUserPreferences(supabase, user.id);
    // Bounds for the calendar day containing the drop (supports Today + Tomorrow).
    const bounds = getDayBoundsFromPreferences(preferences, proposedStart);
    const tasks = await getSchedulableTasks(supabase, user.id, bounds);

    const validation = validateFlexiblePlacement({
      tasks,
      taskId: args.taskId,
      proposedStart,
      dayStart: bounds.dayStart,
      dayEnd: bounds.dayEnd,
    });

    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    const start = validation.start;
    const { error } = await supabase
      .from('tasks')
      .update({
        scheduled_start: start.toISOString(),
        scheduled_end: validation.end.toISOString(),
        status: 'scheduled',
        manual_lock: true,
      })
      .eq('id', args.taskId)
      .eq('user_id', user.id)
      .eq('task_type', 'flexible');

    if (error) {
      return { success: false, error: error.message };
    }

    await runDayScheduleWithNotices(supabase, user.id, proposedStart);
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to move task.';
    return { success: false, error: message };
  }
}

export async function clearManualLockAction(taskId: string): Promise<MoveTaskResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ manual_lock: false })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .eq('task_type', 'flexible');

    if (error) {
      return { success: false, error: error.message };
    }

    await runDayScheduleWithNotices(supabase, user.id);
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reset task.';
    return { success: false, error: message };
  }
}

function addMinutesIso(isoStart: string, minutes: number): string {
  const start = new Date(isoStart);
  return new Date(start.getTime() + minutes * 60 * 1000).toISOString();
}

export async function deleteTaskAction(taskId: string): Promise<DeleteTaskResult> {
  if (!taskId?.trim()) {
    return { success: false, error: 'Task id is required.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  try {
    await deleteTask(supabase, user.id, taskId);
    const preferences = await requireUserPreferences(supabase, user.id);
    await runDayScheduleWithNotices(supabase, user.id);
    const tomorrowRef = addCalendarDays(preferences.timezone, new Date(), 1);
    await runDayScheduleWithNotices(supabase, user.id, tomorrowRef);
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete task.';
    return { success: false, error: message };
  }
}

export async function rescheduleTaskAction(taskId: string): Promise<RescheduleTaskResult> {
  if (!taskId?.trim()) {
    return { success: false, error: 'Task id is required.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  try {
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('id,task_type')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!task) {
      return { success: false, error: 'Task not found.' };
    }

    if (task.task_type === 'fixed') {
      return {
        success: false,
        error: 'Pick a new time for fixed tasks using the time picker.',
      };
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        scheduled_start: null,
        scheduled_end: null,
        status: 'pending',
        manual_lock: false,
      })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .eq('task_type', 'flexible');

    if (error) {
      return { success: false, error: error.message };
    }

    const preferences = await requireUserPreferences(supabase, user.id);
    await runDayScheduleWithNotices(supabase, user.id);
    const tomorrowRef = addCalendarDays(preferences.timezone, new Date(), 1);
    await runDayScheduleWithNotices(supabase, user.id, tomorrowRef);
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reschedule task.';
    return { success: false, error: message };
  }
}

export async function updateFixedTaskTimeAction(args: {
  taskId: string;
  scheduledStartIso: string;
}): Promise<MoveTaskResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  const proposedStart = new Date(args.scheduledStartIso);
  if (Number.isNaN(proposedStart.getTime())) {
    return { success: false, error: 'Invalid start time.' };
  }

  try {
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('id,duration_minutes,task_type')
      .eq('id', args.taskId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!task || task.task_type !== 'fixed') {
      return { success: false, error: 'Fixed task not found.' };
    }

    const scheduledStart = proposedStart.toISOString();
    const scheduledEnd = addMinutesIso(scheduledStart, task.duration_minutes);

    const { error } = await supabase
      .from('tasks')
      .update({
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        status: 'scheduled',
      })
      .eq('id', args.taskId)
      .eq('user_id', user.id)
      .eq('task_type', 'fixed');

    if (error) {
      return { success: false, error: error.message };
    }

    await runDayScheduleWithNotices(supabase, user.id, proposedStart);
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update task time.';
    return { success: false, error: message };
  }
}
