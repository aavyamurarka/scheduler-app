'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { AutoEnableNotifications } from '@/components/AutoEnableNotifications';
import { AutoScheduleRefresher } from '@/components/AutoScheduleRefresher';
import { DayTimeline } from '@/components/DayTimeline';
import { DayToggle } from '@/components/DayToggle';
import { RealtimeScheduleRefresher } from '@/components/RealtimeScheduleRefresher';
import { SignOutButton } from '@/components/SignOutButton';
import { TaskInput } from '@/components/TaskInput';
import { UnscheduledTaskList } from '@/components/UnscheduledTaskList';
import { getUnscheduledTasksForDay } from '@/lib/schedule-service';
import type { Task } from '@/lib/types';

type DayChoice = 'today' | 'tomorrow';

type DayBoundsIso = {
  dayStartIso: string;
  dayEndIso: string;
};

type HomeScheduleProps = {
  userId: string;
  tasks: Task[];
  timeZone: string;
  todayBounds: DayBoundsIso;
  tomorrowBounds: DayBoundsIso;
  initialDay: DayChoice;
  isCalendarConnected: boolean;
  syncLabel: string | null;
};

function syncUrl(day: DayChoice) {
  const url = day === 'tomorrow' ? '/?day=tomorrow' : '/';
  // Update the address bar without a Next.js RSC refetch (keeps the toggle instant).
  window.history.replaceState(window.history.state, '', url);
}

export function HomeSchedule({
  userId,
  tasks,
  timeZone,
  todayBounds,
  tomorrowBounds,
  initialDay,
  isCalendarConnected,
  syncLabel,
}: HomeScheduleProps) {
  const [day, setDay] = useState<DayChoice>(initialDay);
  const [dragTask, setDragTask] = useState<Task | null>(null);

  const onDayChange = useCallback((next: DayChoice) => {
    setDay(next);
    syncUrl(next);
  }, []);

  const bounds = day === 'tomorrow' ? tomorrowBounds : todayBounds;
  const dayLabel = day === 'tomorrow' ? 'Tomorrow' : 'Today';

  const unscheduledTasks = useMemo(() => {
    const dayStart = new Date(bounds.dayStartIso);
    const dayEnd = new Date(bounds.dayEndIso);
    return getUnscheduledTasksForDay(
      tasks,
      { dayStart, dayEnd },
      {
        timeZone,
        referenceDate: dayStart,
        includePendingFlexible: true,
      }
    );
  }, [tasks, bounds.dayStartIso, bounds.dayEndIso, timeZone]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <AutoScheduleRefresher isCalendarConnected={isCalendarConnected} />
      <RealtimeScheduleRefresher userId={userId} />
      <AutoEnableNotifications />

      <header className="z-20 shrink-0 border-b border-[var(--glass-border)] bg-[rgba(247,243,234,0.9)] px-3 py-2.5 backdrop-blur-md sm:px-4 lg:px-5">
        <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <DayToggle value={day} onChange={onDayChange} />
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold tracking-tight text-[var(--ink)] sm:text-xl">
                Scheduler
              </h1>
              <p className="truncate text-xs text-[var(--ink-muted)]">
                {dayLabel}
                {isCalendarConnected
                  ? syncLabel
                    ? ` · Calendar synced ${syncLabel}`
                    : ' · Calendar connected'
                  : ' · Calendar not connected'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isCalendarConnected ? (
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

      <main className="mx-auto grid min-h-0 w-full max-w-[88rem] flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-3 overflow-hidden px-3 py-3 sm:px-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,22rem)] lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:px-5 lg:py-4">
        <section className="glass bubble-lg flex min-h-0 flex-col overflow-hidden p-3 sm:p-4">
          <div className="mb-2 shrink-0">
            <h2 className="font-display text-base font-semibold text-[var(--ink)] sm:text-lg">
              {dayLabel}&apos;s calendar
            </h2>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              Free gaps are marked. Drag tasks from the list or timeline to pin a slot.
            </p>
          </div>
          <DayTimeline
            key={day}
            tasks={tasks}
            dayStartIso={bounds.dayStartIso}
            dayEndIso={bounds.dayEndIso}
            externalDragTask={dragTask}
            onExternalDragEnd={() => setDragTask(null)}
          />
        </section>

        <aside className="min-h-0 overflow-y-auto lg:h-full">
          <TaskInput />
          <UnscheduledTaskList tasks={unscheduledTasks} onDragTaskChange={setDragTask} />
        </aside>
      </main>
    </div>
  );
}
