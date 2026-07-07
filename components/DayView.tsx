import type { Task } from '@/lib/types';

type DayViewProps = {
  scheduled: Task[];
  unscheduled: Task[];
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function badgeForTask(task: Task): string {
  if (task.google_event_id) {
    return 'Calendar';
  }
  if (task.task_type === 'fixed') {
    return 'Fixed';
  }
  return 'Auto';
}

function ScheduleRow({ task }: { task: Task }) {
  const isFixed = task.task_type === 'fixed';

  return (
    <li
      className={`flex gap-3 rounded-lg border px-4 py-3 ${
        isFixed
          ? 'border-zinc-200 bg-zinc-50'
          : 'border-blue-200 bg-white'
      }`}
    >
      <div className="w-16 shrink-0 text-sm font-medium text-zinc-500">
        {task.scheduled_start ? formatTime(task.scheduled_start) : '—'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-900">{task.title}</p>
        <p className="text-sm text-zinc-500">
          {task.duration_minutes} min
          {task.scheduled_end ? ` · ends ${formatTime(task.scheduled_end)}` : ''}
        </p>
      </div>
      <span
        className={`shrink-0 self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isFixed
            ? 'bg-zinc-200 text-zinc-700'
            : 'bg-blue-100 text-blue-700'
        }`}
      >
        {badgeForTask(task)}
      </span>
    </li>
  );
}

export function DayView({ scheduled, unscheduled }: DayViewProps) {
  const hasSchedule = scheduled.length > 0;
  const hasUnscheduled = unscheduled.length > 0;

  if (!hasSchedule && !hasUnscheduled) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
        <p className="text-zinc-600">Your day is empty.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Connect Google Calendar or add tasks to build your schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasSchedule ? (
        <ul className="space-y-2">
          {scheduled.map((task) => (
            <ScheduleRow key={task.id} task={task} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
          No timed slots yet — add fixed tasks or sync your calendar.
        </p>
      )}

      {hasUnscheduled && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-amber-800">Couldn&apos;t schedule</h3>
          <ul className="space-y-2">
            {unscheduled.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-zinc-900">{task.title}</p>
                  <p className="text-sm text-zinc-500">
                    {task.duration_minutes} min · Priority {task.priority ?? '—'}
                    {task.deadline
                      ? ` · Due ${formatTime(task.deadline)}`
                      : ''}
                  </p>
                </div>
                <span className="text-xs font-medium text-amber-700">No slot</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
