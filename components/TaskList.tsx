import type { Task } from '@/lib/types';

import { TaskCard } from '@/components/TaskCard';

type TaskListProps = {
  tasks: Task[];
};

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
        <p className="text-zinc-600">No tasks yet.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Add a fixed commitment or flexible task above to get started.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </ul>
  );
}
