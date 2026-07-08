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

const labelClass = 'mb-1 block text-xs font-medium text-[var(--ink-muted)]';

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
    <section className="glass bubble-lg p-4 sm:p-5">
      <h2 className="font-display text-base font-semibold text-[var(--ink)]">Add a task</h2>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        Fixed = set time. Flexible = auto-placed around your day.
      </p>

      <form ref={formRef} action={formAction} className="mt-5 space-y-4">
        <div>
          <label htmlFor="title" className={labelClass}>
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder={isFixed ? 'e.g. CS lecture' : 'e.g. Groceries, reply to email'}
            className="field"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="task_type" className={labelClass}>
              Type
            </label>
            <select
              id="task_type"
              name="task_type"
              required
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
              className="field"
            >
              <option value="flexible">Flexible</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>

          <div>
            <label htmlFor="duration_minutes" className={labelClass}>
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
              className="field"
            />
          </div>
        </div>

        {isFixed ? (
          <div>
            <label htmlFor="scheduled_start" className={labelClass}>
              Start time
            </label>
            <input
              id="scheduled_start"
              name="scheduled_start"
              type="datetime-local"
              required
              defaultValue={defaultDateTimeLocal()}
              className="field"
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="priority" className={labelClass}>
                Priority
              </label>
              <select id="priority" name="priority" required defaultValue={3} className="field">
                <option value={1}>1 — Highest</option>
                <option value={2}>2 — High</option>
                <option value={3}>3 — Medium</option>
                <option value={4}>4 — Low</option>
                <option value={5}>5 — Lowest</option>
              </select>
            </div>

            <div>
              <label htmlFor="deadline" className={labelClass}>
                Deadline <span className="font-normal text-[var(--ink-faint)]">(optional)</span>
              </label>
              <input id="deadline" name="deadline" type="datetime-local" className="field" />
            </div>
          </div>
        )}

        {state && !state.success && (
          <p className="alert alert-error" role="alert">
            {state.error}
          </p>
        )}

        {state?.success && (
          <p className="alert alert-ok" role="status">
            Task added.
          </p>
        )}

        {reshuffleMessage && (
          <p className="alert alert-warn" role="status">
            {reshuffleMessage}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full text-sm sm:w-auto">
          {pending ? 'Adding…' : 'Add task'}
        </button>
      </form>
    </section>
  );
}
