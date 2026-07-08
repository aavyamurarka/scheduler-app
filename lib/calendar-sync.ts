import type { SupabaseClient } from '@supabase/supabase-js';

import { getCalendarDayBounds } from '@/lib/day-bounds';
import {
  eventDurationMinutes,
  fetchTodaysEvents,
  refreshAccessToken,
} from '@/lib/google-calendar';
import { getUserPreferences } from '@/lib/preferences';
import type { GoogleCalendarTokens } from '@/lib/types';

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export async function getCalendarConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<GoogleCalendarTokens | null> {
  const { data, error } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveCalendarTokens(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const { error } = await supabase.from('google_calendar_tokens').upsert({
    user_id: userId,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const tokens = await getCalendarConnection(supabase, userId);

  if (!tokens) {
    throw new Error('Google Calendar is not connected. Click Connect Google Calendar first.');
  }

  const expiresAt = new Date(tokens.expires_at).getTime();
  const stillValid = expiresAt - Date.now() > EXPIRY_BUFFER_MS;

  if (stillValid) {
    return tokens.access_token;
  }

  const refreshed = await refreshAccessToken(tokens.refresh_token);
  await saveCalendarTokens(
    supabase,
    userId,
    refreshed.access_token,
    tokens.refresh_token,
    refreshed.expires_in
  );

  return refreshed.access_token;
}

export async function syncGoogleCalendarEvents(
  supabase: SupabaseClient,
  userId: string
): Promise<{ imported: number; skipped: number; cleaned: number }> {
  const preferences = await getUserPreferences(supabase, userId);
  const timeZone = preferences?.timezone ?? 'UTC';
  const { dayStart, dayEnd } = getCalendarDayBounds(timeZone);

  const accessToken = await getValidAccessToken(supabase, userId);
  const events = await fetchTodaysEvents(
    accessToken,
    dayStart.toISOString(),
    dayEnd.toISOString()
  );

  let imported = 0;
  let skipped = 0;
  const importedEventIds: string[] = [];

  for (const event of events) {
    const start = event.start?.dateTime;
    const end = event.end?.dateTime;

    if (!start || !end || !event.id) {
      skipped += 1;
      continue;
    }

    const { error } = await supabase.from('tasks').upsert(
      {
        user_id: userId,
        google_event_id: event.id,
        title: event.summary?.trim() || 'Untitled event',
        task_type: 'fixed',
        duration_minutes: eventDurationMinutes(start, end),
        scheduled_start: new Date(start).toISOString(),
        scheduled_end: new Date(end).toISOString(),
        priority: null,
        deadline: null,
        status: 'scheduled',
      },
      { onConflict: 'user_id,google_event_id' }
    );

    if (error) {
      throw error;
    }

    importedEventIds.push(event.id);
    imported += 1;
  }

  // Remove Google-imported tasks outside today's calendar day (in user timezone).
  const { data: staleOutside, error: staleOutsideError } = await supabase
    .from('tasks')
    .delete()
    .eq('user_id', userId)
    .not('google_event_id', 'is', null)
    .or(`scheduled_start.lt.${dayStart.toISOString()},scheduled_start.gte.${dayEnd.toISOString()}`)
    .select('id');

  if (staleOutsideError) {
    throw staleOutsideError;
  }

  // Remove today's Google tasks that were cancelled / no longer returned by Google.
  let cleanedToday = 0;
  const { data: todaysGoogleTasks, error: todayQueryError } = await supabase
    .from('tasks')
    .select('id,google_event_id')
    .eq('user_id', userId)
    .not('google_event_id', 'is', null)
    .gte('scheduled_start', dayStart.toISOString())
    .lt('scheduled_start', dayEnd.toISOString());

  if (todayQueryError) {
    throw todayQueryError;
  }

  const keep = new Set(importedEventIds);
  const toDelete = (todaysGoogleTasks ?? [])
    .filter((task) => task.google_event_id && !keep.has(task.google_event_id))
    .map((task) => task.id);

  if (toDelete.length > 0) {
    const { error: deleteTodayError } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', userId)
      .in('id', toDelete);

    if (deleteTodayError) {
      throw deleteTodayError;
    }
    cleanedToday = toDelete.length;
  }

  await supabase
    .from('google_calendar_tokens')
    .update({ updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  return {
    imported,
    skipped,
    cleaned: (staleOutside?.length ?? 0) + cleanedToday,
  };
}
