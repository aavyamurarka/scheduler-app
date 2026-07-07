# Tech Stack & Tools

- **Frontend:** Next.js (App Router) + React + TypeScript + Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Realtime, Row-Level Security, Edge Functions)
- **Database:** PostgreSQL via Supabase (tasks table with RLS)
- **Styling:** Tailwind CSS — simple, neutral palette, one accent color
- **Authentication:** Supabase Auth (email/password or magic link)
- **Notifications:** OneSignal (free tier) for push notifications
- **Scheduling Logic:** Custom TypeScript greedy algorithm in `lib/scheduler.ts`, invoked via Supabase Edge Function
- **Deployment:** Vercel (free tier) — git push to deploy
- **AI Coding Tool:** Cursor

## Setup Commands

```bash
# 1. Initialize project (if not already done)
npx create-next-app@latest scheduler-app --typescript --tailwind --eslint --app --src-dir=false

# 2. Install dependencies
cd scheduler-app
npm install @supabase/supabase-js

# 3. Environment variables — create .env.local (never commit)
# NEXT_PUBLIC_SUPABASE_URL=your-project-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# ONESIGNAL_APP_ID=your-app-id

# 4. Development
npm run dev

# 5. Lint and build
npm run lint
npm run build
```

## Project Structure

```
scheduler-app/
├── app/                    # Next.js pages/routes
│   ├── page.tsx           # Task input + day view
│   └── api/               # Backend API routes (if needed)
├── components/
│   ├── TaskInput.tsx
│   ├── DayView.tsx
│   └── TaskCard.tsx
├── lib/
│   ├── supabase.ts        # Supabase client setup
│   ├── scheduler.ts       # Auto-scheduling algorithm
│   └── notifications.ts   # OneSignal integration
├── supabase/
│   ├── migrations/        # Database schema changes
│   └── functions/
│       └── reschedule/    # Edge Function for scheduling
├── .env.local              # Secret keys (never commit)
└── package.json
```

## Database Schema

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    task_type TEXT CHECK (task_type IN ('fixed', 'flexible')) NOT NULL,
    duration_minutes INT NOT NULL,
    priority INT, -- 1 (highest) to 5 (lowest), flexible tasks only
    deadline TIMESTAMP,
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed')),
    created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own tasks"
    ON tasks FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_scheduled_start ON tasks(scheduled_start);
```

## Error Handling Pattern

```typescript
// lib/errors.ts — normalize errors at service boundaries
export type AppError = {
  code: string;
  message: string; // user-safe message
};

export function toAppError(error: unknown): AppError {
  if (error instanceof Error) {
    // Log full error server-side; return safe message to UI
    console.error('[Scheduler]', error);
    return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
  }
  return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
}

// Usage in a server action or API route:
// try {
//   const { data, error } = await supabase.from('tasks').insert(task);
//   if (error) throw error;
//   return { data };
// } catch (err) {
//   return { error: toAppError(err) };
// }
```

## Styling & Component Examples

```tsx
// components/TaskCard.tsx — calm, focused day view card
type TaskCardProps = {
  title: string;
  startTime: string;
  isFixed: boolean;
};

export function TaskCard({ title, startTime, isFixed }: TaskCardProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        isFixed ? 'border-neutral-200 bg-neutral-50' : 'border-accent/30 bg-white'
      }`}
    >
      <span className="text-sm font-medium text-neutral-500">{startTime}</span>
      <span className="text-neutral-900">{title}</span>
      {isFixed && (
        <span className="ml-auto text-xs text-neutral-400">fixed</span>
      )}
    </div>
  );
}
// Why: Fixed tasks get a muted style; flexible tasks use the accent color border
// so users can instantly see what's locked vs. auto-scheduled.
```

## Naming Conventions
- **Files:** PascalCase for React components (`TaskInput.tsx`), camelCase for utilities (`scheduler.ts`)
- **Components:** PascalCase (`DayView`, `TaskCard`)
- **Functions/variables:** camelCase (`scheduleDay`, `freeGaps`)
- **Constants/env vars:** UPPER_SNAKE_CASE (`NEXT_PUBLIC_SUPABASE_URL`)
- **Database columns:** snake_case (`duration_minutes`, `scheduled_start`)

## External Services & Accounts Required
1. [Supabase](https://supabase.com) — free tier
2. [Vercel](https://vercel.com) — free tier
3. [OneSignal](https://onesignal.com) — free tier
4. [Cursor](https://cursor.com) — free tier (paid optional)

## Budget
- **Target:** $0/month for v1
- **Most likely paid upgrade:** Cursor Pro if free tier feels limiting during the 40-hour sprint
