'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createTask } from '@/lib/tasks';
import { runDayScheduleWithNotices, type ReshuffleNotice } from '@/lib/schedule-service';
import type { TaskType } from '@/lib/types';

export type CreateTaskResult =
  | { success: true; notices?: ReshuffleNotice[] }
  | { success: false; error: string };

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
    const { notices } = await runDayScheduleWithNotices(supabase, user.id);

    revalidatePath('/');
    return { success: true, notices };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add task.';
    return { success: false, error: message };
  }
}
