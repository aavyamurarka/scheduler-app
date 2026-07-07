import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { buildGoogleAuthUrl } from '@/lib/google-calendar';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'));
  }

  try {
    const state = randomBytes(32).toString('hex');
    const cookieStore = await cookies();

    cookieStore.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    const authUrl = buildGoogleAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google OAuth not configured';
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    return NextResponse.redirect(
      `${base}/?calendar=error&message=${encodeURIComponent(message)}`
    );
  }
}
