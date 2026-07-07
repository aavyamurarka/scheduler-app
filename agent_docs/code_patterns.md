# Code Patterns

## Purpose
This file defines the implementation patterns the agent should follow for this project.
Prefer these patterns over inventing new ones.

## Architecture Pattern
- **Primary pattern:** Feature-based folders with a thin UI layer and logic in `lib/`
- **Rule:** Scheduling algorithm lives in `lib/scheduler.ts` — never embed scheduling logic in React components or API route handlers
- **Rule:** Supabase client setup in `lib/supabase.ts`; all database calls go through typed helper functions in `lib/`
- **Rule:** Edge Functions handle server-side scheduling triggers; frontend calls them via `supabase.functions.invoke()`

## Data Fetching
- **Primary approach:** Supabase client library (`@supabase/supabase-js`) for all database reads/writes
- **Rule:** Use `.from('tasks').select()` with filters for today's schedule; never raw SQL from the frontend
- **Rule:** Keep fetch logic in `lib/` helpers, not inside component render functions
- **Realtime:** Subscribe to `tasks` table changes via Supabase Realtime for live schedule updates

```typescript
// lib/tasks.ts — example data access pattern
import { supabase } from './supabase';

export async function getTodaysTasks(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('scheduled_start', `${today}T00:00:00`)
    .lte('scheduled_start', `${today}T23:59:59`)
    .order('scheduled_start');
  if (error) throw error;
  return data;
}
```

## State Management
- **Server state:** Supabase queries + Realtime subscriptions
- **Client state:** React `useState` / `useReducer` for form inputs and UI toggles
- **Forms:** Controlled React inputs with local state; validate before calling Supabase
- **Rule:** No state library (Redux, Zustand) unless complexity demands it — React built-ins are enough for MVP

## Scheduling Algorithm Pattern

```typescript
// lib/scheduler.ts — greedy placement into free gaps
// 1. Pull fixed tasks → blocked time
// 2. Compute free gaps in the day
// 3. Sort flexible tasks by priority (asc), then deadline (asc)
// 4. Place each task in the first gap that fits before its deadline
// 5. Return { scheduled, unscheduled } — never silently drop tasks

export type Task = {
  id: string;
  title: string;
  task_type: 'fixed' | 'flexible';
  duration_minutes: number;
  priority: number | null;
  deadline: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
};

export function scheduleDay(
  fixedTasks: Task[],
  flexibleTasks: Task[],
  dayStart: Date,
  dayEnd: Date
): { scheduled: Task[]; unscheduled: Task[] } {
  // Implementation: see Tech Design pseudocode
  // Why greedy: easy to understand, debug, and good enough for a single day's schedule
}
```

## Error Handling
- Normalize errors at `lib/` boundaries — never let raw Supabase errors reach the UI
- Never swallow errors silently; always `console.error` server-side
- Return user-safe messages in the UI; log developer context server-side
- Use a consistent `{ data } | { error: AppError }` return shape

## Validation
- Validate task input on the client before submit (title required, duration > 0, priority 1–5 for flexible)
- Validate at the Edge Function boundary before running the scheduler
- Use TypeScript interfaces for task shapes; consider Zod for runtime validation at API boundaries

## File and Naming Conventions
- **Files:** PascalCase for components, camelCase for utilities
- **Components / classes:** PascalCase
- **Functions / variables:** camelCase
- **Constants / env vars:** UPPER_SNAKE_CASE
- **Database:** snake_case columns matching Supabase schema

## Testing Pattern
- Unit tests for `lib/scheduler.ts` (pure logic, no database needed)
- Manual browser testing for UI flows (add task → see schedule → get notification)
- Test RLS manually: confirm User A cannot see User B's tasks
- Run `npm test` after every scheduler change; fix failures before moving on

## Change Discipline
- Prefer focused, minimal edits over large rewrites
- Do not introduce new dependencies without checking `package.json` first
- Do not change existing database migrations — create new ones
- One feature at a time — commit or checkpoint after each working feature
- Explain scheduling and database changes before implementing so the user can learn
