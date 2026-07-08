# AGENTS.md — Master Plan for Scheduler

## Project Overview & Stack
**App:** Scheduler (working name — final name TBD)
**Overview:** A web app for university students that turns "I'll get to it later" into "it's already scheduled." Users dump fixed commitments (classes, meetings) and flexible tasks (groceries, emails) without deciding when to do them. A greedy auto-scheduling engine places flexible tasks into free gaps around fixed blocks, sends push notifications 15 minutes before tasks, and reshuffles the day when new tasks arrive mid-day.
**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres + Auth + Realtime + RLS), Supabase Edge Functions, OneSignal, Vercel
**Critical Constraints:** Mobile-first responsive design, $0/month operating budget (free tiers only), launch before July 15, WCAG 2.1 AA, Row-Level Security on all user data, **Google Calendar read sync required in MVP** (import fixed commitments; manual fixed entry remains as fallback)

## How I Should Think
1. **Understand Intent First**: Before answering, identify what the user actually needs
2. **Ask If Unsure**: If critical information is missing, ask before proceeding
3. **Plan Before Coding**: Propose a plan, ask for approval, then implement
4. **Verify After Changes**: Run tests/linters or manual checks after each change
5. **Explain Trade-offs**: When recommending something, mention alternatives

## Plan → Execute → Verify
1. **Plan:** Outline a brief approach and ask for approval before coding. Use Plan mode when available.
2. **Execute:** Implement one feature at a time.
3. **Verify:** Run tests/linters or manual browser checks after each feature; fix before moving on.

## Setup & Commands
Execute these commands for standard development workflows. Do not invent new package manager commands.
- **Setup:** `npm install`
- **Development:** `npm run dev`
- **Testing:** `npm test`
- **Linting & Formatting:** `npm run lint`
- **Build:** `npm run build`

## Context Files
Load only when needed:
- `agent_docs/tech_stack.md` — Tech details, setup commands, code examples
- `agent_docs/code_patterns.md` — Architecture, naming, error handling patterns
- `agent_docs/project_brief.md` — Persistent project rules and conventions
- `agent_docs/product_requirements.md` — Full PRD feature list and user stories
- `agent_docs/testing.md` — Test strategy and verification loop
- `MEMORY.md` — Active phase, architectural decisions, known issues
- `REVIEW-CHECKLIST.md` — Pre-completion verification checklist

## Current State
**Last Updated:** July 5, 2026
**Working On:** Phase 2 — Core Features (auto-scheduling)
**Recently Completed:** Phase 1 complete — scaffold, Supabase, auth, task input
**Blocked By:** None

## Roadmap

### Phase 1: Foundation (Days 1–2)
- [x] Initialize Next.js project with TypeScript and Tailwind
- [x] Set up Supabase client config (`lib/supabase/`)
- [x] Create database schema and RLS policies (`supabase/migrations/001_create_tasks.sql`)
- [x] Basic task input UI (add a task)

### Phase 2: Core Features (Days 3–7)
- [x] Task input with fixed vs. flexible types, duration, deadline, priority
- [x] **Google Calendar sync** — OAuth connect, import today's events as fixed tasks
- [x] Auto-scheduling engine (`lib/scheduler.ts` + server action)
- [x] Day view showing today's auto-generated schedule
- [ ] Real-time reshuffle when tasks added mid-day (Supabase Realtime)
- [ ] Mid-day reshuffle in-app alerts (what moved and when; push in Phase 3)

### Phase 3: Notifications & Polish (Days 8–9)
- [x] OneSignal integration — 15-minute pre-task push notifications (external minute cron on Hobby)
- [ ] Reshuffle alert notifications (deprioritized for MVP)
- [x] Styling pass: warm dark glass + copper accent (not plain white)
- [x] Mobile responsiveness and accessibility basics

### Phase 4: Launch (Day 10)
- [ ] Beta test with 5 users, fix critical bugs
- [x] Deploy to Vercel
- [ ] Confirm RLS, notifications, and end-to-end user journey
- [ ] Basic DAU analytics

## Protected Areas
Do NOT modify these areas without explicit human approval:
- **Infrastructure:** `infrastructure/`, Dockerfiles, and deployment workflows (`.github/workflows/`)
- **Database Migrations:** Existing migration files (create new migrations instead)
- **Third-Party Integrations:** Supabase Auth config, OneSignal app settings

## Coding Conventions
- **Formatting:** Enforce ESLint/Prettier rules. No warnings in new code.
- **Architecture:** Scheduling logic in `lib/scheduler.ts` and Edge Functions — not in React components or route handlers. Supabase client calls in `lib/`.
- **Testing:** Unit tests for scheduler logic. Manual browser verification for UI flows.
- **Type Safety:** Strict TypeScript. No `any` — use `unknown` with type guards.

## Agent Behaviors
These rules apply across all AI coding assistants (Cursor, Copilot, Claude, Gemini):
1. **Plan Before Execution:** ALWAYS propose a brief step-by-step plan before changing more than one file.
2. **Refactor Over Rewrite:** Prefer refactoring existing functions incrementally rather than completely rewriting large blocks of code.
3. **Context Compaction:** Write states to `MEMORY.md` instead of filling context history during long sessions.
4. **Iterative Verification:** Run tests or linters after each logical change. Fix errors before proceeding (see `REVIEW-CHECKLIST.md`).
5. **Explain Before Generating:** For database schema and scheduling algorithm work, explain the approach before writing code so the user can follow along.

## What NOT To Do
- Do NOT delete files without explicit confirmation
- Do NOT modify database schemas without backup plan
- Do NOT add features not in the current phase
- Do NOT skip tests for "simple" changes
- Do NOT bypass failing tests or pre-commit hooks
- Do NOT use deprecated libraries or patterns
- Do NOT add Gmail or Slack integration in MVP (Google Calendar sync **is** in MVP)
