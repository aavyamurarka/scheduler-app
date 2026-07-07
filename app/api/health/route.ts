import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { ok: false, error: 'Supabase env vars are not configured' },
      { status: 500 }
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      supabase: 'connected',
      tasksTable: 'run migration 001_create_tasks.sql if not done yet',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
