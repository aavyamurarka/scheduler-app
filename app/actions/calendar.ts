'use server';

import { revalidatePath } from 'next/cache';

import { syncGoogleCalendarEvents } from '@/lib/calendar-sync';
import { getUserPreferences } from '@/lib/preferences';
import { runDayScheduleWithNotices, type ReshuffleNotice } from '@/lib/schedule-service';
import { createClient } from '@/lib/supabase/server';

export type SyncCalendarResult =
  | {
      success: true;
      imported: number;
      skipped: number;
      cleaned: number;
      notices?: ReshuffleNotice[];
    }
  | { success: false; error: string };

export async function syncGoogleCalendarAction(): Promise<SyncCalendarResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  try {
    const { imported, skipped, cleaned } = await syncGoogleCalendarEvents(
      supabase,
      user.id
    );
    const preferences = await getUserPreferences(supabase, user.id);
    if (preferences) {
      const { notices } = await runDayScheduleWithNotices(supabase, user.id);
      revalidatePath('/');
      return { success: true, imported, skipped, cleaned, notices };
    }
    revalidatePath('/');
    return { success: true, imported, skipped, cleaned };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Calendar sync failed.';
    return { success: false, error: message };
  }
}
