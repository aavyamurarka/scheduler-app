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
      className={`flex gap-3 rounded-2xl px-4 py-3.5 ${
        isFixed ? 'row-glass' : 'row-accent'
      }`}
    >
      <div className="w-[4.25rem] shrink-0 text-sm font-semibold text-[var(--accent-hot)]">
        {task.scheduled_start ? formatTime(task.scheduled_start) : '—'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[var(--ink)]">{task.title}</p>
        <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
          {task.duration_minutes} min
          {task.scheduled_end ? ` · ends ${formatTime(task.scheduled_end)}` : ''}
        </p>
      </div>
      <span className={`badge shrink-0 self-start ${isFixed ? 'badge-muted' : 'badge-accent'}`}>
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
      <div className="rounded-2xl border border-dashed border-[var(--glass-border)] bg-black/20 p-8 text-center">
        <p className="text-[var(--ink)]">Your day is empty.</p>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Connect Google Calendar or add tasks to build your schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasSchedule ? (
        <ul className="space-y-2.5" aria-label="Scheduled tasks for today">
          {scheduled.map((task) => (
            <ScheduleRow key={task.id} task={task} />
          ))}
        </ul>
      ) : (
        <p className="alert alert-info">
          No timed slots yet — add fixed tasks or connect your calendar.
        </p>
      )}

      {hasUnscheduled && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-[var(--warn)]">
            Couldn&apos;t schedule
          </h3>
          <ul className="space-y-2.5">
            {unscheduled.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between rounded-2xl border border-[rgba(232,192,106,0.28)] bg-[var(--warn-soft)] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--ink)]">{task.title}</p>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {task.duration_minutes} min · Priority {task.priority ?? '—'}
                    {task.deadline ? ` · Due ${formatTime(task.deadline)}` : ''}
                  </p>
                </div>
                <span className="badge badge-muted text-[var(--warn)]">No slot</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
