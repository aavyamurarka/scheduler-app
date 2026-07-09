import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { addCalendarDays } from '@/lib/day-bounds';
import { createTask } from '@/lib/tasks';
import { requireUserPreferences, runDayScheduleWithNotices } from '@/lib/schedule-service';
import type { TaskType } from '@/lib/types';

type CreateTaskBody = {
  title: string;
  task_type: TaskType;
  duration_minutes: number;
  priority?: number;
  deadline?: string;
  scheduled_start?: string;
  notes?: string;
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: corsHeaders() }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return jsonError('Server misconfigured (missing Supabase env).', 500);
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) {
    return jsonError('Missing Authorization bearer token.', 401);
  }

  let body: CreateTaskBody;
  try {
    body = (await request.json()) as CreateTaskBody;
  } catch {
    return jsonError('Invalid JSON body.');
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return jsonError('Please enter a task title.');
  }

  if (body.task_type !== 'fixed' && body.task_type !== 'flexible') {
    return jsonError('Please select a task type.');
  }

  const durationMinutes = Number(body.duration_minutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return jsonError('Duration must be a positive number.');
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return jsonError('Not signed in (invalid or expired token).', 401);
  }

  const task: Parameters<typeof createTask>[2] = {
    title,
    task_type: body.task_type,
    duration_minutes: durationMinutes,
    notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
  };

  if (body.task_type === 'fixed') {
    if (typeof body.scheduled_start !== 'string' || !body.scheduled_start.trim()) {
      return jsonError('Please set a start time for fixed tasks.');
    }
    task.scheduled_start = body.scheduled_start;
  } else {
    const priority = Number(body.priority);
    if (!Number.isFinite(priority) || priority < 1 || priority > 5) {
      return jsonError('Please select a priority from 1 to 5.');
    }
    task.priority = priority;
    if (typeof body.deadline === 'string' && body.deadline.trim()) {
      task.deadline = body.deadline;
    }
  }

  try {
    await createTask(supabase, userData.user.id, task);
    const preferences = await requireUserPreferences(supabase, userData.user.id);
    const { notices } = await runDayScheduleWithNotices(supabase, userData.user.id);
    const tomorrowRef = addCalendarDays(preferences.timezone, new Date(), 1);
    await runDayScheduleWithNotices(supabase, userData.user.id, tomorrowRef);

    return NextResponse.json(
      { success: true, notices },
      { status: 200, headers: corsHeaders() }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add task.';
    return jsonError(message, 500);
  }
}

