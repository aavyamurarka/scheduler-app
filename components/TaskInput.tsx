'use client';

import { useActionState, useRef, useState } from 'react';

import {
  createTaskAction,
  type CreateTaskResult,
} from '@/app/actions/tasks';
import type { TaskType } from '@/lib/types';

const initialState: CreateTaskResult | null = null;

function defaultDateTimeLocal(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

const inputClassName =
  'w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20';

export function TaskInput() {
  const formRef = useRef<HTMLFormElement>(null);
  const [taskType, setTaskType] = useState<TaskType>('flexible');
  const [reshuffleMessage, setReshuffleMessage] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: CreateTaskResult | null, formData: FormData) => {
      const result = await createTaskAction(prev, formData);
      if (result.success) {
        formRef.current?.reset();
        setTaskType('flexible');
        if (result.notices && result.notices.length > 0) {
          const moved = result.notices.slice(0, 3).map((n) => n.title).join(', ');
          const more = result.notices.length > 3 ? ` +${result.notices.length - 3} more` : '';
          setReshuffleMessage(`Reshuffled: ${moved}${more}.`);
        } else {
          setReshuffleMessage(null);
        }
      }
      return result;
    },
    initialState
  );

  const isFixed = taskType === 'fixed';

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6">
      <h2 className="text-base font-semibold text-zinc-900">Add a task</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Fixed = classes and meetings with a set time. Flexible = auto-scheduled around your day.
      </p>

      <form ref={formRef} action={formAction} className="mt-4 space-y-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-zinc-700">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder={isFixed ? 'e.g. CS lecture' : 'e.g. Groceries, reply to email'}
            className={inputClassName}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="task_type" className="mb-1 block text-sm font-medium text-zinc-700">
              Type
            </label>
            <select
              id="task_type"
              name="task_type"
              required
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
              className={inputClassName}
            >
              <option value="flexible">Flexible</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="duration_minutes"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Duration (minutes)
            </label>
            <input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              required
              min={1}
              step={1}
              defaultValue={30}
              className={inputClassName}
            />
          </div>
        </div>

        {isFixed ? (
          <div>
            <label
              htmlFor="scheduled_start"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Start time
            </label>
            <input
              id="scheduled_start"
              name="scheduled_start"
              type="datetime-local"
              required
              defaultValue={defaultDateTimeLocal()}
              className={inputClassName}
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="priority" className="mb-1 block text-sm font-medium text-zinc-700">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                required
                defaultValue={3}
                className={inputClassName}
              >
                <option value={1}>1 — Highest</option>
                <option value={2}>2 — High</option>
                <option value={3}>3 — Medium</option>
                <option value={4}>4 — Low</option>
                <option value={5}>5 — Lowest</option>
              </select>
            </div>

            <div>
              <label htmlFor="deadline" className="mb-1 block text-sm font-medium text-zinc-700">
                Deadline <span className="font-normal text-zinc-400">(optional)</span>
              </label>
              <input
                id="deadline"
                name="deadline"
                type="datetime-local"
                className={inputClassName}
              />
            </div>
          </div>
        )}

        {state && !state.success && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {state.error}
          </p>
        )}

        {state?.success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
            Task added.
          </p>
        )}

        {reshuffleMessage && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
            {reshuffleMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
        >
          {pending ? 'Adding…' : 'Add task'}
        </button>
      </form>
    </section>
  );
}
