import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { saveCalendarTokens, syncGoogleCalendarEvents } from '@/lib/calendar-sync';
import { getUserPreferences } from '@/lib/preferences';
import { runDaySchedule } from '@/lib/schedule-service';
import { exchangeCodeForTokens } from '@/lib/google-calendar';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(
      `${base}/?calendar=error&message=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${base}/?calendar=error&message=${encodeURIComponent('Missing OAuth code')}`
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('google_oauth_state')?.value;

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      `${base}/?calendar=error&message=${encodeURIComponent('Invalid OAuth state')}`
    );
  }

  cookieStore.delete('google_oauth_state');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${base}/login`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${base}/?calendar=error&message=${encodeURIComponent('No refresh token — revoke app access in Google Account settings and try again')}`
      );
    }

    await saveCalendarTokens(
      supabase,
      user.id,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in
    );

    await syncGoogleCalendarEvents(supabase, user.id);
    const preferences = await getUserPreferences(supabase, user.id);
    if (preferences) {
      await runDaySchedule(supabase, user.id);
    }

    return NextResponse.redirect(`${base}/?calendar=connected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Calendar connection failed';
    return NextResponse.redirect(
      `${base}/?calendar=error&message=${encodeURIComponent(message)}`
    );
  }
}
