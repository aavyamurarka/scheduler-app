import type { Task } from '@/lib/types';

import { TaskActions } from '@/components/TaskActions';

type UnscheduledTaskListProps = {
  tasks: Task[];
  onDragTaskChange?: (task: Task | null) => void;
};

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function UnscheduledTaskList({ tasks, onDragTaskChange }: UnscheduledTaskListProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="glass bubble-lg mt-3 p-4 sm:p-5">
      <h2 className="font-display text-sm font-semibold text-[var(--warn)]">
        Couldn&apos;t schedule
      </h2>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        Drag a task onto a free gap in the calendar, or use reschedule / delete below.
      </p>

      <ul className="mt-4 space-y-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', task.id);
              event.dataTransfer.effectAllowed = 'move';
              onDragTaskChange?.(task);
            }}
            onDragEnd={() => onDragTaskChange?.(null)}
            className="cursor-grab rounded-xl border border-[rgba(154,122,48,0.28)] bg-[var(--warn-soft)] px-3 py-3 active:cursor-grabbing"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-[var(--ink)]">{task.title}</p>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  {task.duration_minutes} min · Priority {task.priority ?? '—'}
                  {task.deadline ? ` · Due ${formatDeadline(task.deadline)}` : ''}
                </p>
                {task.notes ? (
                  <p className="mt-1 text-[11px] text-[var(--ink-faint)]">{task.notes}</p>
                ) : null}
              </div>
              <span className="badge badge-muted shrink-0 text-[var(--warn)]">Drag me</span>
            </div>
            <div className="mt-3 border-t border-[rgba(154,122,48,0.2)] pt-3">
              <TaskActions task={task} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
