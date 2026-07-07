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
    <li
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        isFixed
          ? 'border-zinc-200 bg-zinc-50'
          : 'border-blue-200 bg-white'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-900">{task.title}</p>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isFixed
            ? 'bg-zinc-200 text-zinc-700'
            : 'bg-blue-100 text-blue-700'
        }`}
      >
        {badgeLabel}
      </span>
    </li>
  );
}
