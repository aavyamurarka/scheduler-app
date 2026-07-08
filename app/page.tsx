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
    <div className="min-h-full bg-zinc-50">
      <AutoScheduleRefresher isCalendarConnected={Boolean(calendarConnection)} />
      <RealtimeScheduleRefresher userId={user.id} />
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Scheduler</h1>
            <p className="text-sm text-zinc-500">Today</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/preferences"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Edit preferences
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <GoogleCalendarPanel
          isConnected={Boolean(calendarConnection)}
          lastSyncedAt={calendarConnection?.updated_at ?? null}
        />

        <PushNotificationsPanel />

        <section>
          <h2 className="mb-3 text-base font-semibold text-zinc-900">Today&apos;s schedule</h2>
          <DayView scheduled={scheduled} unscheduled={unscheduled} />
        </section>

        <TaskInput />
      </main>
    </div>
  );
}
