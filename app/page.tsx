import { redirect } from 'next/navigation';
import Link from 'next/link';

import { AutoEnableNotifications } from '@/components/AutoEnableNotifications';
import { AutoScheduleRefresher } from '@/components/AutoScheduleRefresher';
import { DayView } from '@/components/DayView';
import { RealtimeScheduleRefresher } from '@/components/RealtimeScheduleRefresher';
import { TaskInput } from '@/components/TaskInput';
import { SignOutButton } from '@/components/SignOutButton';
import { getDayBoundsFromPreferences } from '@/lib/day-bounds';
import { getCalendarConnection, syncGoogleCalendarEvents } from '@/lib/calendar-sync';
import { getUserPreferences } from '@/lib/preferences';
import { partitionDayView, runDaySchedule } from '@/lib/schedule-service';
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
  const { scheduled, unscheduled } = partitionDayView(tasks, bounds);
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

      <header className="sticky top-0 z-20 border-b border-[var(--glass-border)] bg-[rgba(247,243,234,0.72)] px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">
              Scheduler
            </h1>
            <p className="text-sm text-[var(--ink-muted)]">
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
              <a href="/api/google-calendar/connect" className="btn-primary text-sm">
                Connect calendar
              </a>
            ) : null}
            <Link href="/preferences" className="btn-ghost text-sm">
              Preferences
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.9fr)] lg:gap-6 lg:px-8 lg:py-8">
        <section className="animate-rise glass bubble-lg min-h-[28rem] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
              Today&apos;s schedule
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Flexible tasks fill gaps around your fixed commitments.
            </p>
          </div>
          <DayView scheduled={scheduled} unscheduled={unscheduled} />
        </section>

        <aside className="animate-rise animate-rise-delay-1 lg:sticky lg:top-24 lg:self-start">
          <TaskInput />
        </aside>
      </main>
    </div>
  );
}
