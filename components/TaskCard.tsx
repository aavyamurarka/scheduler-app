import type { Task } from '@/lib/types';

type TaskCardProps = {
  task: Task;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function TaskCard({ task }: TaskCardProps) {
  const isFixed = task.task_type === 'fixed';

  const subtitle = isFixed
    ? task.scheduled_start
      ? `${formatDateTime(task.scheduled_start)} · ${task.duration_minutes} min`
      : `${task.duration_minutes} min`
    : [
        `Priority ${task.priority ?? '—'}`,
        task.deadline ? `Due ${formatDateTime(task.deadline)}` : null,
        `${task.duration_minutes} min`,
      ]
        .filter(Boolean)
        .join(' · ');

  const badgeLabel = task.google_event_id
    ? 'Calendar'
    : isFixed
      ? 'Fixed'
      : 'Flexible';

  return (
    <li className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${isFixed ? 'row-glass' : 'row-accent'}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[var(--ink)]">{task.title}</p>
        <p className="text-sm text-[var(--ink-muted)]">{subtitle}</p>
      </div>
      <span className={`badge shrink-0 ${isFixed ? 'badge-muted' : 'badge-accent'}`}>
        {badgeLabel}
      </span>
    </li>
  );
}
