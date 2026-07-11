import { redirect } from 'next/navigation';

import { HomeSchedule } from '@/components/HomeSchedule';
import {
  addCalendarDays,
  getDayBoundsFromPreferences,
} from '@/lib/day-bounds';
import { getCalendarConnection } from '@/lib/calendar-sync';
import { getUserPreferences } from '@/lib/preferences';
import { createClient } from '@/lib/supabase/server';
import { getTasks } from '@/lib/tasks';

type HomeProps = {
  searchParams?: Promise<{ day?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
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

  const params = (await searchParams) ?? {};
  const initialDay = params.day === 'tomorrow' ? 'tomorrow' : 'today';

  // Schedule + Google sync happen in createTaskAction / AutoScheduleRefresher —
  // keep page render to a fast read so revalidatePath after add/move stays snappy.
  const [calendarConnection, tasks] = await Promise.all([
    getCalendarConnection(supabase, user.id),
    getTasks(supabase, user.id),
  ]);

  const tomorrowRef = addCalendarDays(preferences.timezone, new Date(), 1);
  const todayBounds = getDayBoundsFromPreferences(preferences, new Date());
  const tomorrowBounds = getDayBoundsFromPreferences(preferences, tomorrowRef);
  const syncLabel = calendarConnection?.updated_at
    ? new Date(calendarConnection.updated_at).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <HomeSchedule
      userId={user.id}
      tasks={tasks}
      timeZone={preferences.timezone}
      todayBounds={{
        dayStartIso: todayBounds.dayStart.toISOString(),
        dayEndIso: todayBounds.dayEnd.toISOString(),
      }}
      tomorrowBounds={{
        dayStartIso: tomorrowBounds.dayStart.toISOString(),
        dayEndIso: tomorrowBounds.dayEnd.toISOString(),
      }}
      initialDay={initialDay}
      isCalendarConnected={Boolean(calendarConnection)}
      syncLabel={syncLabel}
    />
  );
}
