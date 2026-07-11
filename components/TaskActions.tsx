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

type MenuPosition = {
  top: number;
  left: number;
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

const MENU_WIDTH = 148;

function getMenuPosition(trigger: HTMLElement, menuHeight: number): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const margin = 8;
  let top = rect.bottom + 4;
  if (top + menuHeight > window.innerHeight - margin) {
    top = rect.top - menuHeight - 4;
  }

  let left = rect.right - MENU_WIDTH;
  left = Math.max(margin, Math.min(left, window.innerWidth - MENU_WIDTH - margin));

  return { top, left };
}

export function TaskActions({ task, variant = 'default', onDone }: TaskActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [editingFixed, setEditingFixed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [fixedStart, setFixedStart] = useState(() =>
    toDateTimeLocalValue(task.scheduled_start)
  );
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMenu = variant === 'menu';
  const menuHeight = editingFixed && task.task_type === 'fixed' ? 168 : 88;

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) {
        return;
      }
      if (menuRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
      setEditingFixed(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setEditingFixed(false);
      }
    }

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
    setEditingFixed(false);
    setMenuPosition(null);
  }

  function toggleMenu(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (menuOpen) {
      closeMenu();
      return;
    }

    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    setMenuPosition(getMenuPosition(trigger, menuHeight));
    setMenuOpen(true);
    setEditingFixed(false);
    setError(null);
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
    const trigger = triggerRef.current;
    if (trigger) {
      setMenuPosition(getMenuPosition(trigger, 168));
    }
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

  const menuPopup =
    menuOpen && menuPosition && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Options for ${task.title}`}
            className="fixed z-[100] overflow-hidden rounded-lg border border-[var(--glass-border-strong)] bg-white shadow-lg"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: MENU_WIDTH,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {editingFixed && task.task_type === 'fixed' ? (
              <div className="space-y-2 p-2">
                <p className="text-[11px] font-medium text-[var(--ink-muted)]">New start time</p>
                <input
                  type="datetime-local"
                  value={fixedStart}
                  onChange={(event) => setFixedStart(event.target.value)}
                  className="field text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-primary flex-1 px-2 py-1 text-xs"
                    disabled={isPending}
                    onClick={submitFixedReschedule}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1 text-xs"
                    disabled={isPending}
                    onClick={() => setEditingFixed(false)}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-1">
                {task.task_type === 'flexible' ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
                    disabled={isPending}
                    onClick={handleFlexibleReschedule}
                  >
                    {isPending ? 'Working…' : 'Reschedule'}
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--accent-soft)]"
                    disabled={isPending}
                    onClick={handleFixedReschedule}
                  >
                    Reschedule
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-50"
                  disabled={isPending}
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            )}
            {error ? (
              <p className="border-t border-[var(--glass-border)] px-3 py-2 text-[11px] text-[var(--danger)]">
                {error}
              </p>
            ) : null}
          </div>,
          document.body
        )
      : null;

  if (isMenu) {
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Options for ${task.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="absolute right-1.5 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--glass-border)] bg-white/95 text-sm leading-none text-[var(--ink-muted)] shadow-sm hover:border-[var(--glass-border-strong)] hover:text-[var(--ink)]"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={toggleMenu}
        >
          ⋯
        </button>
        {menuPopup}
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

      {editingFixed && task.task_type === 'fixed' ? (
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
      ) : null}

      {error ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
