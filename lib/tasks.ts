import type { SupabaseClient } from '@supabase/supabase-js';

import type { NewTask, Task } from '@/lib/types';

function toIsoTimestamp(value: string, fieldName: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return date.toISOString();
}

function addMinutes(isoStart: string, minutes: number): string {
  const start = new Date(isoStart);
  return new Date(start.getTime() + minutes * 60 * 1000).toISOString();
}

export async function getTasks(
  supabase: SupabaseClient,
  userId: string
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createTask(
  supabase: SupabaseClient,
  userId: string,
  task: NewTask
): Promise<Task> {
  const title = task.title.trim();

  if (!title) {
    throw new Error('Task title is required');
  }

  if (task.duration_minutes <= 0) {
    throw new Error('Duration must be greater than 0');
  }

  const insert: Record<string, unknown> = {
    user_id: userId,
    title,
    task_type: task.task_type,
    duration_minutes: task.duration_minutes,
  };

  if (task.task_type === 'fixed') {
    if (!task.scheduled_start) {
      throw new Error('Fixed tasks require a start time');
    }

    const scheduledStart = toIsoTimestamp(task.scheduled_start, 'start time');
    insert.scheduled_start = scheduledStart;
    insert.scheduled_end = addMinutes(scheduledStart, task.duration_minutes);
    insert.priority = null;
    insert.deadline = null;
    insert.status = 'scheduled';
  } else {
    const priority = task.priority ?? 3;
    if (priority < 1 || priority > 5) {
      throw new Error('Priority must be between 1 (highest) and 5 (lowest)');
    }

    insert.priority = priority;
    insert.deadline = task.deadline
      ? toIsoTimestamp(task.deadline, 'deadline')
      : null;
    insert.scheduled_start = null;
    insert.scheduled_end = null;
    insert.status = 'pending';
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(insert)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
