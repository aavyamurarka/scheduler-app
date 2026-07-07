import type { SupabaseClient } from '@supabase/supabase-js';

import type { UserPreferences } from '@/lib/types';

export async function getUserPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveUserPreferences(
  supabase: SupabaseClient,
  userId: string,
  input: {
    wake_time: string;
    sleep_time: string;
    timezone: string;
  }
): Promise<UserPreferences> {
  const wakeMinutes = timeToMinutes(input.wake_time);
  const sleepMinutes = timeToMinutes(input.sleep_time);

  if (sleepMinutes <= wakeMinutes) {
    throw new Error('Sleep time must be after wake-up time.');
  }

  const row = {
    user_id: userId,
    wake_time: normalizeTimeInput(input.wake_time),
    sleep_time: normalizeTimeInput(input.sleep_time),
    timezone: input.timezone,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(row)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function normalizeTimeInput(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
