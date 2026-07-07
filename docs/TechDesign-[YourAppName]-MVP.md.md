# Technical Design Document: [AppName] MVP

## Overview

This document explains **how** we'll build [AppName], starting from zero technical background, using Cursor as your AI pair-programmer. The approach is chosen to maximize learning in the three areas you care about — **APIs, databases, and the scheduling algorithm** — while still being realistic for a ~40-hour build.

## Recommended Approach

### Best Path for You: Low-Code with Cursor, Real Code Underneath

- **Why this works:** You'll write and read real code (not drag-and-drop), but Cursor generates most of it and explains as it goes. This is the only path of the four options that actually teaches APIs/databases/algorithms — no-code tools would hide exactly the layers you want to learn.
- **Time to MVP:** ~40 hours (your stated budget) is workable for this scope if we hold the line on the MVP boundaries already set in the PRD.
- **Learning curve:** Steep on day 1-2, much faster after that once the patterns click.
- **Cost:** $0/month target, with a couple of decision points flagged below where a paid tier would remove real friction.

## Tech Stack (Chosen for Learning + Your Constraints)

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | **Next.js** (React framework) + Tailwind CSS | Huge community, Cursor/AI tools know it extremely well, so debugging help is abundant |
| Backend + Database | **Supabase** (Postgres + Auth + Realtime + Row-Level Security) | Gives you a real SQL database (good for learning), built-in auth, and real-time updates out of the box — directly matches your PRD's RLS requirement |
| Scheduling Logic | Custom TypeScript function, run as a **Supabase Edge Function** | This is your "algorithm" learning ground — plain code, no framework magic |
| Notifications | **OneSignal** (free tier) for push notifications | See trade-off discussion below |
| Calendar/Third-Party Integration | **Deferred structure** — see decision below | See trade-off discussion below |
| Deployment | **Vercel** (free tier) | Git push → live site, zero DevOps knowledge required |
| AI Coding Tool | **Cursor** | Already chosen |

### Alternatives Considered

| Decision | Chosen | Alternative | Why chosen won |
|----------|--------|-------------|-----------------|
| Frontend framework | Next.js | React + Vite (lighter, fewer conventions) | Next.js has more AI-generated examples/tutorials available, which matters a lot with zero prior knowledge — but Vite is a fair pick if Next.js ever feels over-engineered |
| Backend | Supabase | Firebase (NoSQL) | Your scheduling logic needs to query "what's free between X and Y" — much more natural in SQL (Supabase/Postgres) than Firebase's NoSQL model |
| Backend | Supabase | Custom Node + Express + Postgres | Full control, but means building auth, RLS, and hosting yourself — too much surface area for a 40-hour, zero-background build |

## Key Decision: Notifications

This is a real trade-off, so here it is honestly:

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **OneSignal (recommended)** | Free tier is generous; handles the hard parts (browser permissions, delivery) for you | One more third-party account/API to learn | Free |
| Native Web Push API | No third party, fully "yours" | Requires you to manage service workers and VAPID keys yourself — a genuinely hard concept even for developers | Free |
| Email reminders (Resend) | Simplest to implement, very reliable | Not as immediate/naggy as a push notification — weaker fit for your "15 min before" requirement | Free tier |

**Recommendation:** Start with OneSignal. If it ever feels limiting, native Web Push is the natural next step — and by then you'll understand notifications well enough to tackle it.

## Key Decision: Calendar Integration

Your PRD flagged this as an open question, so let's resolve it here.

| Option | Pros | Cons |
|--------|------|------|
| **Manual fixed-task entry (v1 — recommended)** | No OAuth complexity, ships fast, fully within your timeline | User has to type in classes/meetings once instead of auto-import |
| **Google Calendar API sync (v1)** | Genuinely "smart," matches original vision, and *is* real API-learning | OAuth setup (consent screens, token refresh, scopes) is one of the trickiest things to debug with zero background — real risk to your July 15 date |

**Recommendation:** Manual entry for v1. This isn't a downgrade of ambition — it's the same decision professional teams make constantly (cut scope to protect the deadline). Google Calendar sync becomes an excellent v1.1 project once your core app works and you've built confidence with simpler APIs (like OneSignal) first.

## Project Structure

```
[app-name]/
├── app/                    # Next.js pages/routes
│   ├── page.tsx           # Task input + day view
│   └── api/               # Backend API routes
├── components/
│   ├── TaskInput.tsx
│   ├── DayView.tsx
│   └── TaskCard.tsx
├── lib/
│   ├── supabase.ts        # Supabase client setup
│   ├── scheduler.ts       # The auto-scheduling algorithm
│   └── notifications.ts   # OneSignal integration
├── supabase/
│   ├── migrations/        # Database schema changes
│   └── functions/
│       └── reschedule/    # Edge Function for the algorithm
├── .env.local              # Secret keys (never commit this)
└── package.json
```

## Database Schema (Where You'll Learn "Databases")

```sql
-- Users (handled automatically by Supabase Auth)

-- Tasks table — the core of everything
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    task_type TEXT CHECK (task_type IN ('fixed', 'flexible')) NOT NULL,
    duration_minutes INT NOT NULL,
    priority INT, -- 1 (highest) to 5 (lowest), only used for flexible tasks
    deadline TIMESTAMP,
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed')),
    created_at TIMESTAMP DEFAULT now()
);

-- Row-Level Security — matches your PRD's security requirement directly
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own tasks"
    ON tasks FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_scheduled_start ON tasks(scheduled_start);
```

**What you'll learn here:** what a table actually is, how foreign keys link data together, and — importantly — how Row-Level Security enforces that one user can never see another user's tasks, at the database level rather than just in app code. This directly satisfies the security instinct you already had.

## The Scheduling Algorithm (Where You'll Learn "Algorithm Logic")

This is genuinely the most interesting part of your app, and a great first algorithm to learn because it's intuitive to reason about.

### Plain-English Logic
1. Pull all `fixed` tasks for the day → these define blocked-out time
2. Compute the "free gaps" left in the day around those fixed blocks
3. Sort `flexible` tasks by priority, then by deadline urgency (soonest deadline first among same priority)
4. Walk through the free gaps in time order, placing each flexible task into the first gap big enough to fit its duration
5. If a task doesn't fit anywhere before its deadline, flag it as "unscheduled" rather than silently dropping it

### Pseudocode
```typescript
function scheduleDay(fixedTasks: Task[], flexibleTasks: Task[], dayStart: Date, dayEnd: Date) {
  const freeGaps = computeFreeGaps(fixedTasks, dayStart, dayEnd);
  const sortedFlexible = flexibleTasks.sort(byPriorityThenDeadline);

  const scheduled: Task[] = [];
  const unscheduled: Task[] = [];

  for (const task of sortedFlexible) {
    const gap = freeGaps.find(g => gapDuration(g) >= task.duration_minutes);
    if (gap) {
      task.scheduled_start = gap.start;
      task.scheduled_end = addMinutes(gap.start, task.duration_minutes);
      scheduled.push(task);
      shrinkGap(gap, task.duration_minutes); // reduce remaining free time in that gap
    } else {
      unscheduled.push(task);
    }
  }

  return { scheduled, unscheduled };
}
```

**Why this approach (a "greedy" algorithm) and not something fancier:** more advanced scheduling (like constraint solvers) exists, but a greedy approach is easy to understand, easy to debug, and good enough for a single day's schedule with a handful of tasks. This is genuinely how you'd want to start learning algorithmic thinking — you can always upgrade the logic later once you understand why it sometimes makes suboptimal choices.

### Real-Time Reshuffle (Mid-Day Notification Feature)
When a new task is added mid-day:
1. Re-run `scheduleDay()` with the new task included
2. Compare the new schedule to the old one to find what moved
3. Use **Supabase Realtime** to push the updated schedule to the open browser tab instantly
4. Trigger a OneSignal notification listing what changed

This is where "real-time updates" and "the algorithm" intersect — a good moment to slow down and make sure you understand both pieces separately before combining them.

## API Layer (Where You'll Learn "APIs")

Your app will have a few key API interactions:

| API Call | Purpose | Learning Focus |
|----------|---------|-----------------|
| Supabase client `.from('tasks').insert()` | Add a new task | How frontend code talks to a database via an API, without writing your own server |
| Supabase client `.from('tasks').select()` | Load today's schedule | Querying/filtering data |
| Supabase Edge Function call | Trigger the scheduling algorithm | How to run backend logic in response to an event |
| OneSignal REST API | Send a push notification | Calling a genuine third-party API with an API key |

Starting with Supabase's client library (rather than writing raw HTTP requests) is intentional — it lets you experience "calling an API" without also having to learn low-level networking details on day one. Once comfortable, look under the hood at what Supabase's client is actually doing (it's just HTTP requests with your API key attached) — that's a good "aha" moment for understanding APIs generally.

## Development Setup

1. **Install Cursor** — cursor.com
2. **Create a Supabase project** — supabase.com (free tier)
3. **Create a Vercel account** — vercel.com (free tier)
4. **Create a OneSignal account** — onesignal.com (free tier)
5. **Initialize the project:**
   ```bash
   npx create-next-app@latest [app-name] --typescript --tailwind
   cd [app-name]
   npm install @supabase/supabase-js
   ```
6. **Set up environment variables** in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ONESIGNAL_APP_ID=your-app-id
   ```

## AI Assistance Strategy (Matching Your "Mix" Preference)

| Task Type | Who Leads | Example |
|-----------|-----------|---------|
| Simple UI pieces (buttons, forms, layout) | **You try first**, Cursor assists | "Try building the task input form yourself, ask Cursor if stuck" |
| Database schema and queries | **Cursor leads**, you review | "Ask Cursor to write the migration, then read through it line by line" |
| Scheduling algorithm | **Cursor leads first pass**, then **you modify** | "Have Cursor generate the greedy scheduler, then try changing the priority logic yourself" |
| Notification integration | **Cursor leads** | Third-party API wiring is fiddly; let AI handle boilerplate |
| Debugging errors | **Mixed** — paste the error, ask Cursor to explain before fixing | Builds the habit of understanding, not just copy-pasting fixes |

### Effective Prompts to Use in Cursor
```
I need to build [feature] for my task-scheduling app.
Stack: Next.js, Supabase (Postgres), TypeScript.
Requirements:
- [requirement from PRD]
Please explain your approach before writing code, so I can follow along.
```

## Build Plan (~40 Hours / 10 Days)

| Days | Focus | Deliverable |
|------|-------|-------------|
| 1-2 | Setup + Auth + basic task input | Users can sign up and add a task |
| 3-4 | Database schema + fixed vs. flexible task entry | Tasks save correctly with RLS enforced |
| 5-6 | Scheduling algorithm | Flexible tasks auto-placed into free gaps |
| 7 | Real-time reshuffle on new task | Adding a task mid-day updates the schedule live |
| 8 | Notifications (OneSignal, 15-min-before + reshuffle alerts) | Push notifications fire correctly |
| 9 | Styling pass (simple, neutral, one accent color) + mobile responsiveness | App looks and feels like your PRD's vibe |
| 10 | Beta test with your 5 users, fix critical bugs, deploy | Live on Vercel |

## Cost Breakdown

> Verify current pricing directly with each vendor before relying on this — free tier limits change. Last checked: 2026-04.

| Service | Free Tier Covers | Notes |
|---------|-------------------|-------|
| Supabase | Small user base, generous DB storage | Check supabase.com/pricing for row/storage limits |
| Vercel | Personal projects, low traffic | Check vercel.com/pricing |
| OneSignal | Generous free push notification volume | Check onesignal.com/pricing |
| Cursor | Limited free usage, may need paid tier for heavy daily use | Check cursor.com/pricing — this is the most likely place you'd actually spend money |

**Total target: $0/month**, with Cursor's paid tier as the most likely place you'd choose to spend, if the free tier feels limiting during your 40-hour sprint.

## Important Limitations (Be Honest With Yourself Here)

1. **No Google Calendar sync in v1** — users must manually enter fixed tasks. *Workaround:* clearly communicate this to your 5 beta testers so it's not a surprise.
2. **Greedy scheduling isn't optimal** — it won't always find the *best* possible arrangement, just a *good* one. *Workaround:* fine for MVP; revisit if beta users complain about placements feeling wrong.
3. **Push notifications require browser permission** — some beta users may decline. *Workaround:* fall back to an in-app notification banner if browser push is denied.

## Beta Testing Plan
- **Testers:** 5 users (per your PRD)
- **What to watch:** Does the schedule feel sensible? Do notifications actually fire? Does anything crash?
- **Feedback method:** Direct conversation after a few days of real use

## Success Checklist

### Before Starting Development
- [ ] Supabase, Vercel, OneSignal, Cursor accounts created
- [ ] Understood why Google Calendar sync is deferred
- [ ] Comfortable with the manual task entry trade-off

### During Development
- [ ] Following the day-by-day build plan
- [ ] Testing each feature before moving to the next
- [ ] Committing code regularly (even simple `git commit -m "added task input"`)
- [ ] Asking Cursor to explain, not just generate, when something is unclear

### Before Launch
- [ ] RLS confirmed working (test that one user truly cannot see another's tasks)
- [ ] Notifications tested on your own phone/browser
- [ ] Mobile responsiveness checked
- [ ] Deployed and accessible via a live URL

## Definition of Technical Success

Your technical implementation is successful when:
- The app runs without crashing during your beta week
- All 4 must-have features from your PRD work end-to-end
- You can explain, in your own words, how the scheduling algorithm decides where to place a task
- You understand what RLS is doing and why it matters
- Monthly costs are at or near $0
- Your 5 beta testers actually use it more than once

---
*Technical Design for: [AppName]*
*Approach: Cursor-assisted, real code, learning-focused*
*Estimated Time to MVP: ~40 hours over 10 days*
*Estimated Cost: $0/month (Cursor paid tier optional)*
