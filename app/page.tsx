import { redirect } from 'next/navigation';
import Link from 'next/link';

import { AutoEnableNotifications } from '@/components/AutoEnableNotifications';
import { AutoScheduleRefresher } from '@/components/AutoScheduleRefresher';
import { DayTimeline } from '@/components/DayTimeline';
import { RealtimeScheduleRefresher } from '@/components/RealtimeScheduleRefresher';
import { TaskInput } from '@/components/TaskInput';
import { SignOutButton } from '@/components/SignOutButton';
import { getDayBoundsFromPreferences } from '@/lib/day-bounds';
import { getCalendarConnection, syncGoogleCalendarEvents } from '@/lib/calendar-sync';
import { getUserPreferences } from '@/lib/preferences';
import { runDaySchedule } from '@/lib/schedule-service';
import { createClient } from '@/lib/supabase/server';
import { getTasks } from '@/lib/tasks';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const preferences = await getUserPreferences(supabase, user.id);

  if (!preferences) {
    redirect('/onboarding');
  }

  const calendarConnection = await getCalendarConnection(supabase, user.id);

  if (calendarConnection) {
    try {
      await syncGoogleCalendarEvents(supabase, user.id);
    } catch (err) {
      console.error('[Scheduler] Auto calendar sync failed', err);
    }
  }

  await runDaySchedule(supabase, user.id);

  const bounds = getDayBoundsFromPreferences(preferences);
  const tasks = await getTasks(supabase, user.id);
  const syncLabel = calendarConnection?.updated_at
    ? new Date(calendarConnection.updated_at).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="relative min-h-full">
      <AutoScheduleRefresher isCalendarConnected={Boolean(calendarConnection)} />
      <RealtimeScheduleRefresher userId={user.id} />
      <AutoEnableNotifications />

      <header className="sticky top-0 z-20 border-b border-[var(--glass-border)] bg-[rgba(247,243,234,0.78)] px-3 py-2.5 backdrop-blur-md sm:px-4 lg:px-5">
        <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-semibold tracking-tight text-[var(--ink)] sm:text-xl">
              Scheduler
            </h1>
            <p className="text-xs text-[var(--ink-muted)]">
              Today
              {calendarConnection
                ? syncLabel
                  ? ` · Calendar synced ${syncLabel}`
                  : ' · Calendar connected'
                : ' · Calendar not connected'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!calendarConnection ? (
              <a href="/api/google-calendar/connect" className="btn-primary text-xs">
                Connect calendar
              </a>
            ) : null}
            <Link href="/preferences" className="btn-ghost text-xs">
              Preferences
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[88rem] gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,22rem)] lg:gap-5 lg:px-5 lg:py-5">
        <section className="animate-rise glass bubble-lg min-h-[32rem] p-3 sm:p-4">
          <div className="mb-3">
            <h2 className="font-display text-base font-semibold text-[var(--ink)] sm:text-lg">
              Today&apos;s calendar
            </h2>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              Free gaps are marked. Drag flexible tasks to pin a slot.
            </p>
          </div>
          <DayTimeline
            tasks={tasks}
            dayStartIso={bounds.dayStart.toISOString()}
            dayEndIso={bounds.dayEnd.toISOString()}
          />
        </section>

        <aside className="animate-rise animate-rise-delay-1 lg:sticky lg:top-16 lg:self-start">
          <TaskInput />
        </aside>
      </main>
    </div>
  );
}
