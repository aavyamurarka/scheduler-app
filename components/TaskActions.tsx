'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';

import {
  deleteTaskAction,
  rescheduleTaskAction,
  updateFixedTaskTimeAction,
} from '@/app/actions/tasks';
import type { Task } from '@/lib/types';

type TaskActionsProps = {
  task: Task;
  variant?: 'default' | 'menu';
  onDone?: () => void;
};

function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  }

  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

type MenuPanelProps = {
  task: Task;
  isPending: boolean;
  error: string | null;
  editingFixed: boolean;
  fixedStart: string;
  onFlexibleReschedule: () => void;
  onFixedReschedule: () => void;
  onDelete: () => void;
  onFixedStartChange: (value: string) => void;
  onSubmitFixed: () => void;
  onCancelFixed: () => void;
  onClose: () => void;
  className?: string;
};

function MenuPanel({
  task,
  isPending,
  error,
  editingFixed,
  fixedStart,
  onFlexibleReschedule,
  onFixedReschedule,
  onDelete,
  onFixedStartChange,
  onSubmitFixed,
  onCancelFixed,
  onClose,
  className = '',
}: MenuPanelProps) {
  return (
    <div
      className={`flex flex-col gap-1 ${className}`}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {task.task_type === 'flexible' ? (
        <button
          type="button"
          className="rounded-md px-2 py-1.5 text-left text-xs font-medium text-[var(--ink)] hover:bg-white/70 disabled:opacity-50"
          disabled={isPending}
          onClick={onFlexibleReschedule}
        >
          {isPending ? 'Working…' : 'Reschedule'}
        </button>
      ) : (
        <button
          type="button"
          className="rounded-md px-2 py-1.5 text-left text-xs font-medium text-[var(--ink)] hover:bg-white/70"
          disabled={isPending}
          onClick={onFixedReschedule}
        >
          Reschedule
        </button>
      )}
      <button
        type="button"
        className="rounded-md px-2 py-1.5 text-left text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-50"
        disabled={isPending}
        onClick={onDelete}
      >
        Delete
      </button>
      {editingFixed && task.task_type === 'fixed' ? (
        <div className="space-y-2 border-t border-[var(--glass-border)] pt-2">
          <input
            type="datetime-local"
            value={fixedStart}
            onChange={(event) => onFixedStartChange(event.target.value)}
            className="field text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary px-2 py-1 text-xs"
              disabled={isPending}
              onClick={onSubmitFixed}
            >
              {isPending ? 'Saving…' : 'Save time'}
            </button>
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-xs"
              disabled={isPending}
              onClick={onCancelFixed}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="px-1 text-[10px] text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="mt-0.5 rounded-md px-2 py-1 text-left text-[10px] text-[var(--ink-faint)] hover:bg-white/60"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );
}

export function TaskActions({ task, variant = 'default', onDone }: TaskActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [editingFixed, setEditingFixed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null);
  const [fixedStart, setFixedStart] = useState(() =>
    toDateTimeLocalValue(task.scheduled_start)
  );
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isMenu = variant === 'menu';

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) {
        return;
      }
      if (overlayHost?.contains(target)) {
        return;
      }
      setMenuOpen(false);
      setEditingFixed(false);
    }

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen, overlayHost]);

  function closeMenu() {
    setMenuOpen(false);
    setEditingFixed(false);
  }

  function handleDelete() {
    const calendarNote = task.google_event_id
      ? ' Calendar events may reappear on the next sync.'
      : '';
    const confirmed = window.confirm(`Delete "${task.title}"?${calendarNote}`);
    if (!confirmed) {
      return;
    }

    closeMenu();
    startTransition(async () => {
      setError(null);
      const result = await deleteTaskAction(task.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onDone?.();
    });
  }

  function handleFlexibleReschedule() {
    closeMenu();
    startTransition(async () => {
      setError(null);
      const result = await rescheduleTaskAction(task.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onDone?.();
    });
  }

  function handleFixedReschedule() {
    setEditingFixed(true);
    setFixedStart(toDateTimeLocalValue(task.scheduled_start));
    setError(null);
  }

  function submitFixedReschedule() {
    startTransition(async () => {
      setError(null);
      const result = await updateFixedTaskTimeAction({
        taskId: task.id,
        scheduledStartIso: fixedStart,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      closeMenu();
      onDone?.();
    });
  }

  const panelProps: MenuPanelProps = {
    task,
    isPending,
    error,
    editingFixed,
    fixedStart,
    onFlexibleReschedule: handleFlexibleReschedule,
    onFixedReschedule: handleFixedReschedule,
    onDelete: handleDelete,
    onFixedStartChange: setFixedStart,
    onSubmitFixed: submitFixedReschedule,
    onCancelFixed: () => setEditingFixed(false),
    onClose: closeMenu,
  };

  const fixedEditor =
    editingFixed && task.task_type === 'fixed' ? (
      <div className="space-y-2">
        <input
          type="datetime-local"
          value={fixedStart}
          onChange={(event) => setFixedStart(event.target.value)}
          className="field text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary px-2 py-1 text-xs"
            disabled={isPending}
            onClick={submitFixedReschedule}
          >
            {isPending ? 'Saving…' : 'Save time'}
          </button>
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-xs"
            disabled={isPending}
            onClick={() => setEditingFixed(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    ) : null;

  if (isMenu) {
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Options for ${task.title}`}
          aria-expanded={menuOpen}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--glass-border-strong)] bg-white text-base font-bold leading-none text-[var(--ink-muted)] shadow-sm hover:bg-[var(--bg-mid)] hover:text-[var(--ink)]"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (!menuOpen) {
              const host = triggerRef.current?.closest('[data-task-block]') as HTMLElement | null;
              setOverlayHost(host);
            }
            setMenuOpen((open) => !open);
            if (menuOpen) {
              setEditingFixed(false);
            }
          }}
        >
          ⋯
        </button>

        {menuOpen && overlayHost
          ? createPortal(
              <div
                className="absolute inset-0 z-40 flex flex-col justify-center rounded-[inherit] bg-[rgba(247,243,234,0.97)] p-2 shadow-inner backdrop-blur-sm"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <p className="mb-1 truncate px-1 text-[10px] font-semibold text-[var(--ink)]">
                  {task.title}
                </p>
                <MenuPanel {...panelProps} />
              </div>,
              overlayHost
            )
          : null}
      </>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {task.task_type === 'flexible' ? (
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-xs disabled:opacity-50"
            disabled={isPending}
            onClick={handleFlexibleReschedule}
          >
            {isPending ? 'Working…' : 'Reschedule'}
          </button>
        ) : (
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-xs disabled:opacity-50"
            disabled={isPending}
            onClick={handleFixedReschedule}
          >
            Reschedule
          </button>
        )}
        <button
          type="button"
          className="btn-ghost px-2 py-1 text-xs text-[var(--danger)] disabled:opacity-50"
          disabled={isPending}
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>

      {fixedEditor}

      {error ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
