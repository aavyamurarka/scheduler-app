'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import {
  clearManualLockAction,
  moveFlexibleTaskAction,
} from '@/app/actions/tasks';
import {
  clampStartIntoFreeGap,
  getTimelineFreeGaps,
  isManuallyLockedFlexible,
} from '@/lib/schedule-service';
import type { Task } from '@/lib/types';

const PX_PER_MINUTE = 1.15;

type DayTimelineProps = {
  tasks: Task[];
  dayStartIso: string;
  dayEndIso: string;
};

type DragState = {
  taskId: string;
  durationMinutes: number;
  offsetY: number;
  ghostTop: number;
  proposedStart: Date | null;
};

function formatHour(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function minutesBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (60 * 1000);
}

function priorityLabel(priority: number | null): string {
  if (!priority) return 'P—';
  return `P${priority}`;
}

function badgeKind(task: Task): string {
  if (task.google_event_id) return 'Calendar';
  if (task.task_type === 'fixed') return 'Fixed';
  if (task.manual_lock) return 'Pinned';
  return 'Auto';
}

export function DayTimeline({ tasks, dayStartIso, dayEndIso }: DayTimelineProps) {
  const dayStart = useMemo(() => new Date(dayStartIso), [dayStartIso]);
  const dayEnd = useMemo(() => new Date(dayEndIso), [dayEndIso]);
  const totalMinutes = Math.max(60, minutesBetween(dayStart, dayEnd));
  const heightPx = totalMinutes * PX_PER_MINUTE;

  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const tasksRef = useRef(tasks);
  const dayStartRef = useRef(dayStart);
  const dayEndRef = useRef(dayEnd);
  const heightPxRef = useRef(heightPx);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => new Date());

  tasksRef.current = tasks;
  dayStartRef.current = dayStart;
  dayEndRef.current = dayEnd;
  heightPxRef.current = heightPx;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      document.body.dataset.timelineDragging = '0';
    };
  }, []);

  const scheduled = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            task.scheduled_start &&
            task.scheduled_end &&
            new Date(task.scheduled_end) > dayStart &&
            new Date(task.scheduled_start) < dayEnd
        )
        .sort(
          (a, b) =>
            new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime()
        ),
    [tasks, dayStart, dayEnd]
  );

  const unscheduled = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.task_type === 'flexible' &&
          (task.status === 'pending' || !task.scheduled_start)
      ),
    [tasks]
  );

  const freeGaps = useMemo(
    () => getTimelineFreeGaps(tasks, dayStart, dayEnd, drag?.taskId),
    [tasks, dayStart, dayEnd, drag?.taskId]
  );

  const hourMarks = useMemo(() => {
    const marks: Date[] = [];
    const cursor = new Date(dayStart);
    cursor.setMinutes(0, 0, 0);
    if (cursor < dayStart) {
      cursor.setHours(cursor.getHours() + 1);
    }
    while (cursor <= dayEnd) {
      marks.push(new Date(cursor));
      cursor.setHours(cursor.getHours() + 1);
    }
    return marks;
  }, [dayStart, dayEnd]);

  const nowOffset =
    now >= dayStart && now <= dayEnd ? minutesBetween(dayStart, now) * PX_PER_MINUTE : null;

  useEffect(() => {
    function clientYToRawStart(clientY: number, offsetY: number): Date | null {
      const track = trackRef.current;
      if (!track) return null;
      const rect = track.getBoundingClientRect();
      const y = Math.min(
        Math.max(0, clientY - rect.top - offsetY),
        heightPxRef.current
      );
      const minutes = y / PX_PER_MINUTE;
      return new Date(dayStartRef.current.getTime() + minutes * 60 * 1000);
    }

    function updateGhost(clientY: number, state: DragState) {
      const raw = clientYToRawStart(clientY, state.offsetY);
      if (!raw) return;

      const gaps = getTimelineFreeGaps(
        tasksRef.current,
        dayStartRef.current,
        dayEndRef.current,
        state.taskId
      );
      const clamped = clampStartIntoFreeGap(
        raw,
        state.durationMinutes,
        gaps,
        dayStartRef.current,
        dayEndRef.current
      );

      if (!clamped) {
        const next = { ...state, proposedStart: null, ghostTop: state.ghostTop };
        dragRef.current = next;
        setDrag(next);
        return;
      }

      const top = minutesBetween(dayStartRef.current, clamped) * PX_PER_MINUTE;
      const next = { ...state, proposedStart: clamped, ghostTop: top };
      dragRef.current = next;
      setDrag(next);
    }

    function endDrag(commit: boolean) {
      const state = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      document.body.dataset.timelineDragging = '0';

      if (!commit || !state?.proposedStart) {
        return;
      }

      startTransition(async () => {
        setError(null);
        setMessage(null);
        const result = await moveFlexibleTaskAction({
          taskId: state.taskId,
          scheduledStartIso: state.proposedStart!.toISOString(),
        });
        if (!result.success) {
          setError(result.error);
        } else {
          setMessage('Pinned to that slot.');
        }
      });
    }

    function onMove(event: PointerEvent) {
      const state = dragRef.current;
      if (!state) return;
      event.preventDefault();
      updateGhost(event.clientY, state);
    }

    function onUp() {
      if (!dragRef.current) return;
      endDrag(true);
    }

    function onCancel() {
      if (!dragRef.current) return;
      endDrag(false);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [startTransition]);

  function beginDrag(task: Task, event: React.PointerEvent<HTMLDivElement>) {
    if (task.task_type !== 'flexible' || !task.scheduled_start) return;
    event.preventDefault();
    event.stopPropagation();

    const track = trackRef.current;
    if (!track) return;

    const blockTop =
      minutesBetween(dayStart, new Date(task.scheduled_start)) * PX_PER_MINUTE;
    const rect = track.getBoundingClientRect();
    const pointerY = event.clientY - rect.top;
    const offsetY = pointerY - blockTop;

    setError(null);
    setMessage(null);
    document.body.dataset.timelineDragging = '1';

    const initial: DragState = {
      taskId: task.id,
      durationMinutes: task.duration_minutes,
      offsetY,
      ghostTop: blockTop,
      proposedStart: new Date(task.scheduled_start),
    };
    dragRef.current = initial;
    setDrag(initial);
  }

  function resetLock(taskId: string) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await clearManualLockAction(taskId);
      if (!result.success) {
        setError(result.error);
      } else {
        setMessage('Back on auto-schedule.');
      }
    });
  }

  const draggingTask = drag
    ? tasks.find((task) => task.id === drag.taskId) ?? null
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--ink-muted)]">
          Drag flexible tasks onto free gaps · snaps to 15 min · fixed blocks stay locked
        </p>
        {isPending ? (
          <span className="text-xs text-[var(--ink-faint)]">Saving…</span>
        ) : null}
      </div>

      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="alert alert-ok" role="status">
          {message}
        </p>
      ) : null}

      <div className="relative overflow-hidden rounded-lg border border-[var(--glass-border)] bg-white/40">
        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)]">
          <div
            className="relative border-r border-[var(--glass-border)] bg-white/30"
            style={{ height: heightPx }}
          >
            {hourMarks.map((mark) => {
              const top = minutesBetween(dayStart, mark) * PX_PER_MINUTE;
              return (
                <div
                  key={mark.toISOString()}
                  className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-[var(--ink-faint)]"
                  style={{ top }}
                >
                  {formatHour(mark)}
                </div>
              );
            })}
          </div>

          <div ref={trackRef} className="relative select-none" style={{ height: heightPx }}>
            {hourMarks.map((mark) => {
              const top = minutesBetween(dayStart, mark) * PX_PER_MINUTE;
              return (
                <div
                  key={`line-${mark.toISOString()}`}
                  className="pointer-events-none absolute inset-x-0 border-t border-[rgba(70,100,80,0.12)]"
                  style={{ top }}
                />
              );
            })}

            {freeGaps.map((gap, index) => {
              const top = minutesBetween(dayStart, gap.start) * PX_PER_MINUTE;
              const height = Math.max(8, minutesBetween(gap.start, gap.end) * PX_PER_MINUTE);
              return (
                <div
                  key={`gap-${index}`}
                  className="pointer-events-none absolute inset-x-2 rounded-md border border-dashed border-[rgba(95,127,104,0.35)] bg-[rgba(95,127,104,0.08)]"
                  style={{ top, height }}
                >
                  {height > 22 ? (
                    <span className="absolute left-2 top-1 text-[10px] font-medium uppercase tracking-wide text-[var(--accent-hot)]">
                      Free
                    </span>
                  ) : null}
                </div>
              );
            })}

            {nowOffset !== null ? (
              <div
                className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                style={{ top: nowOffset }}
              >
                <div className="h-2 w-2 -translate-x-1 rounded-full bg-[#c45c48]" />
                <div className="h-[2px] flex-1 bg-[#c45c48]" />
                <span className="ml-2 rounded bg-[#c45c48] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                  Now
                </span>
              </div>
            ) : null}

            {drag && draggingTask ? (
              <div
                className={`pointer-events-none absolute inset-x-3 z-30 rounded-md border px-2.5 py-1.5 shadow-md ${
                  drag.proposedStart
                    ? 'border-[var(--accent)] bg-[rgba(95,127,104,0.28)]'
                    : 'border-[#c45c48] bg-[rgba(196,92,72,0.2)]'
                }`}
                style={{
                  top: drag.ghostTop,
                  height: Math.max(28, draggingTask.duration_minutes * PX_PER_MINUTE),
                }}
              >
                <p className="truncate text-xs font-semibold text-[var(--ink)]">
                  {draggingTask.title}
                </p>
                <p className="text-[10px] text-[var(--ink-muted)]">
                  {drag.proposedStart
                    ? `${formatHour(drag.proposedStart)} · releasing pins here`
                    : 'No free gap here'}
                </p>
              </div>
            ) : null}

            {scheduled.map((task) => {
              const start = new Date(task.scheduled_start!);
              const end = new Date(task.scheduled_end!);
              const clippedStart = start < dayStart ? dayStart : start;
              const clippedEnd = end > dayEnd ? dayEnd : end;
              const top = minutesBetween(dayStart, clippedStart) * PX_PER_MINUTE;
              const height = Math.max(
                28,
                minutesBetween(clippedStart, clippedEnd) * PX_PER_MINUTE
              );
              const isNow = start <= now && end > now;
              const isFlexible = task.task_type === 'flexible';
              const isFixed = task.task_type === 'fixed';
              const isDragging = drag?.taskId === task.id;

              return (
                <div
                  key={task.id}
                  onPointerDown={(event) => {
                    if (!isFlexible) return;
                    beginDrag(task, event);
                  }}
                  className={`absolute inset-x-3 z-[5] overflow-hidden rounded-md border px-2.5 py-1.5 shadow-sm transition-opacity ${
                    isDragging ? 'opacity-30' : 'opacity-100'
                  } ${
                    isNow
                      ? 'border-[#c45c48] bg-[rgba(196,92,72,0.16)] ring-2 ring-[#c45c48]/40'
                      : isFixed
                        ? 'border-[var(--glass-border-strong)] bg-white/80'
                        : 'border-[rgba(95,127,104,0.35)] bg-[linear-gradient(120deg,rgba(95,127,104,0.18),rgba(255,255,255,0.75))]'
                  } ${isFlexible ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-default'}`}
                  style={{ top, height }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-xs font-semibold text-[var(--ink)]">
                          {task.title}
                        </p>
                        {isNow ? (
                          <span className="rounded bg-[#c45c48] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            Now
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[10px] text-[var(--ink-muted)]">
                        {formatHour(start)} – {formatHour(end)}
                        {task.duration_minutes ? ` · ${task.duration_minutes}m` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {isFlexible ? (
                        <span
                          className={`badge ${
                            (task.priority ?? 3) <= 2 ? 'badge-accent' : 'badge-muted'
                          }`}
                        >
                          {priorityLabel(task.priority)}
                        </span>
                      ) : null}
                      <span className={`badge ${isFixed ? 'badge-muted' : 'badge-accent'}`}>
                        {badgeKind(task)}
                      </span>
                      {isManuallyLockedFlexible(task) ? (
                        <button
                          type="button"
                          className="text-[10px] font-medium text-[var(--accent-hot)] underline"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => resetLock(task.id)}
                        >
                          Auto
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {unscheduled.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--warn)]">
            Couldn&apos;t schedule
          </h3>
          <ul className="space-y-2">
            {unscheduled.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-[rgba(154,122,48,0.28)] bg-[var(--warn-soft)] px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">{task.title}</p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {task.duration_minutes} min · {priorityLabel(task.priority)}
                  </p>
                </div>
                <span className="badge badge-muted text-[var(--warn)]">No slot</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
