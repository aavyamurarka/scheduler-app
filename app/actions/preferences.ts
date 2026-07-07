'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { saveUserPreferences } from '@/lib/preferences';

export type SavePreferencesResult =
  | { success: true }
  | { success: false; error: string };

function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  // Next.js redirects throw a special error with a digest like "NEXT_REDIRECT;...".
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}

export async function savePreferencesAction(
  _prevState: SavePreferencesResult | null,
  formData: FormData
): Promise<SavePreferencesResult> {
  const wakeTime = formData.get('wake_time');
  const sleepTime = formData.get('sleep_time');
  const timezone = formData.get('timezone');

  if (typeof wakeTime !== 'string' || !wakeTime) {
    return { success: false, error: 'Please set your wake-up time.' };
  }

  if (typeof sleepTime !== 'string' || !sleepTime) {
    return { success: false, error: 'Please set your sleep time.' };
  }

  if (typeof timezone !== 'string' || !timezone.trim()) {
    return { success: false, error: 'Could not detect timezone. Please refresh and try again.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  try {
    await saveUserPreferences(supabase, user.id, {
      wake_time: wakeTime,
      sleep_time: sleepTime,
      timezone: timezone.trim(),
    });

    redirect('/');
  } catch (err) {
    if (isNextRedirectError(err)) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Failed to save preferences.';
    return { success: false, error: message };
  }
}
