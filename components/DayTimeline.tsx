'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import {
  clearManualLockAction,
  moveFlexibleTaskAction,
} from '@/app/actions/tasks';
import { TaskActions } from '@/components/TaskActions';
import {
  clampStartIntoFreeGap,
  getTimelineFreeGaps,
  isManuallyLockedFlexible,
} from '@/lib/schedule-service';
import type { Task } from '@/lib/types';

const PX_PER_MINUTE = 1.35;
const MIN_BLOCK_HEIGHT = 44;
/** Keeps first/last hour labels from being clipped by the scroll edge. */
const TRACK_EDGE_PAD = 14;
/** Room for header + section title + hint above the scrollable track. */
const CALENDAR_CHROME_OFFSET = '11.5rem';

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

type OptimisticMove = {
  taskId: string;
  scheduled_start: string;
  scheduled_end: string;
  manual_lock: true;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const tasksRef = useRef(tasks);
  const dayStartRef = useRef(dayStart);
  const dayEndRef = useRef(dayEnd);
  const heightPxRef = useRef(heightPx);
  const optimisticRef = useRef<OptimisticMove | null>(null);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [optimistic, setOptimistic] = useState<OptimisticMove | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => new Date());

  tasksRef.current = tasks;
  dayStartRef.current = dayStart;
  dayEndRef.current = dayEnd;
  heightPxRef.current = heightPx;
  optimisticRef.current = optimistic;

  // Drop optimistic state once server props include the pinned times.
  useEffect(() => {
    if (!optimistic) return;
    const serverTask = tasks.find((task) => task.id === optimistic.taskId);
    if (
      serverTask?.scheduled_start === optimistic.scheduled_start &&
      serverTask?.scheduled_end === optimistic.scheduled_end &&
      serverTask.manual_lock
    ) {
      setOptimistic(null);
    }
  }, [tasks, optimistic]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      document.body.dataset.timelineDragging = '0';
    };
  }, []);

  const displayTasks = useMemo(() => {
    if (!optimistic) return tasks;
    return tasks.map((task) =>
      task.id === optimistic.taskId
        ? {
            ...task,
            scheduled_start: optimistic.scheduled_start,
            scheduled_end: optimistic.scheduled_end,
            status: 'scheduled' as const,
            manual_lock: true,
          }
        : task
    );
  }, [tasks, optimistic]);

  const scheduled = useMemo(
    () =>
      displayTasks
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
    [displayTasks, dayStart, dayEnd]
  );

  const freeGaps = useMemo(
    () => getTimelineFreeGaps(displayTasks, dayStart, dayEnd, drag?.taskId),
    [displayTasks, dayStart, dayEnd, drag?.taskId]
  );

  const hourMarks = useMemo(() => {
    const marks: Date[] = [];
    // Always show the wake boundary, then every whole hour, then sleep.
    marks.push(new Date(dayStart));

    const cursor = new Date(dayStart);
    cursor.setMinutes(0, 0, 0);
    if (cursor <= dayStart) {
      cursor.setHours(cursor.getHours() + 1);
    }

    while (cursor < dayEnd) {
      marks.push(new Date(cursor));
      cursor.setHours(cursor.getHours() + 1);
    }

    if (dayEnd.getTime() !== dayStart.getTime()) {
      marks.push(new Date(dayEnd));
    }

    return marks;
  }, [dayStart, dayEnd]);

  function trackTop(date: Date): number {
    return TRACK_EDGE_PAD + minutesBetween(dayStart, date) * PX_PER_MINUTE;
  }

  // Jump near "now" once; user can scroll the full wake→sleep range.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const current = new Date();
    if (current < dayStart || current > dayEnd) {
      scroller.scrollTop = 0;
      return;
    }
    scroller.scrollTop = Math.max(0, trackTop(current) - 80);
    // Intentionally only when the viewed day changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayStartIso, dayEndIso]);

  const nowOffset =
    now >= dayStart && now <= dayEnd ? minutesBetween(dayStart, now) * PX_PER_MINUTE : null;

  useEffect(() => {
    function clientYToRawStart(clientY: number, offsetY: number): Date | null {
      const track = trackRef.current;
      if (!track) return null;
      const rect = track.getBoundingClientRect();
      const y = Math.min(
        Math.max(0, clientY - rect.top - offsetY - TRACK_EDGE_PAD),
        heightPxRef.current
      );
      const minutes = y / PX_PER_MINUTE;
      return new Date(dayStartRef.current.getTime() + minutes * 60 * 1000);
    }

    function updateGhost(clientY: number, state: DragState) {
      const raw = clientYToRawStart(clientY, state.offsetY);
      if (!raw) return;

      const sourceTasks = optimisticRef.current
        ? tasksRef.current.map((task) =>
            task.id === optimisticRef.current!.taskId
              ? {
                  ...task,
                  scheduled_start: optimisticRef.current!.scheduled_start,
                  scheduled_end: optimisticRef.current!.scheduled_end,
                  manual_lock: true,
                }
              : task
          )
        : tasksRef.current;

      const gaps = getTimelineFreeGaps(
        sourceTasks,
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
      // ghostTop is minutes-based; TRACK_EDGE_PAD is applied when rendering.
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

      const end = new Date(
        state.proposedStart.getTime() + state.durationMinutes * 60 * 1000
      );

      // Optimistic: keep the card at the drop position immediately.
      setOptimistic({
        taskId: state.taskId,
        scheduled_start: state.proposedStart.toISOString(),
        scheduled_end: end.toISOString(),
        manual_lock: true,
      });
      setError(null);
      setMessage('Pinned to that slot.');

      startTransition(async () => {
        const result = await moveFlexibleTaskAction({
          taskId: state.taskId,
          scheduledStartIso: state.proposedStart!.toISOString(),
        });
        if (!result.success) {
          setOptimistic(null);
          setError(result.error);
          setMessage(null);
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

    const start = new Date(task.scheduled_start);
    const minutesFromStart = minutesBetween(dayStart, start) * PX_PER_MINUTE;
    const blockTop = TRACK_EDGE_PAD + minutesFromStart;
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
      ghostTop: minutesFromStart,
      proposedStart: start,
    };
    dragRef.current = initial;
    setDrag(initial);
  }

  function resetLock(taskId: string) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      if (optimistic?.taskId === taskId) {
        setOptimistic(null);
      }
      const result = await clearManualLockAction(taskId);
      if (!result.success) {
        setError(result.error);
      } else {
        setMessage('Back on auto-schedule.');
      }
    });
  }

  const draggingTask = drag
    ? displayTasks.find((task) => task.id === drag.taskId) ?? null
    : null;

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--ink-muted)]">
          Drag flexible tasks onto free gaps · snaps to 15 min · fixed blocks stay locked
        </p>
        {isPending ? (
          <span className="text-xs text-[var(--ink-faint)]">Saving…</span>
        ) : null}
      </div>

      {error ? (
        <p className="alert alert-error shrink-0" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="alert alert-ok shrink-0" role="status">
          {message}
        </p>
      ) : null}

      <div
        ref={scrollRef}
        className="overflow-y-auto overscroll-contain rounded-lg border border-[var(--glass-border)] bg-white/40"
        style={{ maxHeight: `calc(100dvh - ${CALENDAR_CHROME_OFFSET})` }}
      >
        <div
          className="grid grid-cols-[3.5rem_minmax(0,1fr)]"
          style={{ height: heightPx + TRACK_EDGE_PAD * 2 }}
        >
          <div className="relative border-r border-[var(--glass-border)] bg-white/30">
            {hourMarks.map((mark, index) => (
              <div
                key={`${mark.toISOString()}-${index}`}
                className="absolute right-2 text-[10px] font-medium text-[var(--ink-faint)]"
                style={{
                  top: trackTop(mark),
                  transform:
                    index === 0
                      ? 'translateY(0)'
                      : index === hourMarks.length - 1
                        ? 'translateY(-100%)'
                        : 'translateY(-50%)',
                }}
              >
                {formatHour(mark)}
              </div>
            ))}
          </div>

          <div ref={trackRef} className="relative select-none">
            {hourMarks.map((mark, index) => (
              <div
                key={`line-${mark.toISOString()}-${index}`}
                className="pointer-events-none absolute inset-x-0 border-t border-[rgba(70,100,80,0.12)]"
                style={{ top: trackTop(mark) }}
              />
            ))}

            {freeGaps.map((gap, index) => {
              const top = trackTop(gap.start);
              const height = Math.max(8, minutesBetween(gap.start, gap.end) * PX_PER_MINUTE);
              return (
                <div
                  key={`gap-${index}`}
                  className="pointer-events-none absolute inset-x-0 border-y border-dashed border-[rgba(95,127,104,0.28)] bg-[rgba(95,127,104,0.06)]"
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
                style={{ top: TRACK_EDGE_PAD + nowOffset }}
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
                className={`pointer-events-none absolute inset-x-0 z-30 border px-2.5 py-1.5 shadow-md ${
                  drag.proposedStart
                    ? 'border-[var(--accent)] bg-[rgba(69,104,83,0.42)]'
                    : 'border-[#c45c48] bg-[rgba(196,92,72,0.2)]'
                }`}
                style={{
                  top: TRACK_EDGE_PAD + drag.ghostTop,
                  height: Math.max(
                    MIN_BLOCK_HEIGHT,
                    draggingTask.duration_minutes * PX_PER_MINUTE
                  ),
                }}
              >
                <p className="truncate text-xs font-semibold leading-tight text-[var(--ink)]">
                  {draggingTask.title}
                </p>
                <p className="text-[10px] leading-tight text-[var(--ink-muted)]">
                  {drag.proposedStart
                    ? `${formatHour(drag.proposedStart)} · release to pin`
                    : 'No free gap here'}
                </p>
              </div>
            ) : null}

            {scheduled.map((task) => {
              const start = new Date(task.scheduled_start!);
              const end = new Date(task.scheduled_end!);
              const clippedStart = start < dayStart ? dayStart : start;
              const clippedEnd = end > dayEnd ? dayEnd : end;
              const top = trackTop(clippedStart);
              const naturalHeight = minutesBetween(clippedStart, clippedEnd) * PX_PER_MINUTE;
              const height = Math.min(
                Math.max(MIN_BLOCK_HEIGHT, naturalHeight),
                Math.max(12, TRACK_EDGE_PAD + heightPx - top)
              );
              const isCompact = naturalHeight < 52;
              const isNow = start <= now && end > now;
              const isFlexible = task.task_type === 'flexible';
              const isFixed = task.task_type === 'fixed';
              const isDragging = drag?.taskId === task.id;

              return (
                <div
                  key={task.id}
                  data-task-block
                  onPointerDown={(event) => {
                    if (!isFlexible) return;
                    beginDrag(task, event);
                  }}
                  className={`group relative overflow-visible absolute inset-x-0 z-[5] border px-2.5 py-1 shadow-sm transition-opacity ${
                    isDragging ? 'opacity-25' : 'opacity-100'
                  } ${
                    isNow
                      ? 'border-[#c45c48] bg-[rgba(196,92,72,0.22)] ring-2 ring-[#c45c48]/40'
                      : isFixed
                        ? 'border-[var(--glass-border-strong)] bg-white/85'
                        : 'border-[rgba(69,104,83,0.45)] bg-[linear-gradient(120deg,rgba(69,104,83,0.34),rgba(95,127,104,0.22))]'
                  } ${isFlexible ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-default'}`}
                  style={{ top, height }}
                >
                  <div className="flex h-full flex-col justify-center pr-8">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-xs font-semibold leading-tight text-[var(--ink)]">
                          {task.title}
                          {isNow ? ' · Now' : ''}
                        </p>
                        {!isCompact && isNow ? (
                          <span className="rounded bg-[#c45c48] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            Now
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[10px] leading-tight text-[var(--ink-muted)]">
                        {formatHour(start)}–{formatHour(end)}
                        {task.duration_minutes ? ` · ${task.duration_minutes}m` : ''}
                        {isFlexible ? ` · ${priorityLabel(task.priority)}` : ''}
                        {` · ${badgeKind(task)}`}
                      </p>
                    </div>
                    {isManuallyLockedFlexible(task) ? (
                      <button
                        type="button"
                        className="mt-0.5 w-fit text-[10px] font-medium text-[var(--accent-hot)] underline"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => resetLock(task.id)}
                      >
                        Back to auto
                      </button>
                    ) : null}
                  </div>
                  <TaskActions task={task} variant="menu" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
