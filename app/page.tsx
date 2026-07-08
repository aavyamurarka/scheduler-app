import { redirect } from 'next/navigation';
import Link from 'next/link';

import { AutoScheduleRefresher } from '@/components/AutoScheduleRefresher';
import { GoogleCalendarPanel } from '@/components/GoogleCalendarPanel';
import { PushNotificationsPanel } from '@/components/PushNotificationsPanel';
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
    // Best-effort auto-sync on every page load; never block the page if Google is down.
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

  return (
    <div className="relative min-h-full overflow-hidden">
      <div
        className="ambient-orb -right-16 top-10 h-56 w-56 bg-[radial-gradient(circle,rgba(224,138,79,0.35),transparent_70%)]"
        aria-hidden
      />
      <div
        className="ambient-orb -left-20 bottom-24 h-64 w-64 bg-[radial-gradient(circle,rgba(90,140,180,0.22),transparent_70%)]"
        aria-hidden
      />

      <AutoScheduleRefresher isCalendarConnected={Boolean(calendarConnection)} />
      <RealtimeScheduleRefresher userId={user.id} />

      <header className="sticky top-0 z-20 px-4 pb-2 pt-4 sm:px-6">
        <div className="nav-pill mx-auto flex max-w-3xl items-center justify-between rounded-full px-4 py-3 sm:px-5">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--ink)] sm:text-2xl">
              Scheduler
            </h1>
            <p className="text-xs text-[var(--ink-muted)] sm:text-sm">Today, already arranged</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/preferences" className="btn-ghost text-sm">
              Preferences
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8">
        <div className="animate-rise">
          <GoogleCalendarPanel
            isConnected={Boolean(calendarConnection)}
            lastSyncedAt={calendarConnection?.updated_at ?? null}
          />
        </div>

        <div className="animate-rise animate-rise-delay-1">
          <PushNotificationsPanel />
        </div>

        <section className="animate-rise animate-rise-delay-2 glass bubble-lg p-4 sm:p-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--ink)] sm:text-xl">
                Today&apos;s schedule
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Flexible tasks fill the gaps around your fixed blocks.
              </p>
            </div>
          </div>
          <DayView scheduled={scheduled} unscheduled={unscheduled} />
        </section>

        <div className="animate-rise animate-rise-delay-3">
          <TaskInput />
        </div>
      </main>
    </div>
  );
}
