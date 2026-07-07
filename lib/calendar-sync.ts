import type { SupabaseClient } from '@supabase/supabase-js';

import {
  eventDurationMinutes,
  fetchTodaysEvents,
  refreshAccessToken,
} from '@/lib/google-calendar';
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
): Promise<{ imported: number; skipped: number }> {
  const accessToken = await getValidAccessToken(supabase, userId);
  const events = await fetchTodaysEvents(accessToken);

  let imported = 0;
  let skipped = 0;

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

    imported += 1;
  }

  await supabase
    .from('google_calendar_tokens')
    .update({ updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  return { imported, skipped };
}
