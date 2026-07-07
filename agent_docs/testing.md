# Testing Strategy

## Frameworks
- **Unit Tests:** Vitest — for pure scheduling logic in `lib/scheduler.ts`
- **E2E Tests:** Manual browser testing for MVP (Playwright optional post-launch)
- **Integration Tests:** Manual Supabase RLS verification (two test accounts)

## What to Test

### Unit Tests (Vitest)
- `scheduleDay()` places flexible tasks into correct free gaps
- Fixed tasks are never moved or overwritten
- Tasks with no fitting gap before deadline go to `unscheduled`
- Priority sorting: higher priority (lower number) scheduled first
- Deadline urgency: sooner deadline wins among same priority
- Mid-day reshuffle: adding a task recalculates and reports moved tasks

### Manual Checks (Browser)
- [ ] Sign up / sign in via Supabase Auth
- [ ] Add a fixed task — appears in day view, visually distinct
- [ ] Add flexible tasks with different priorities — auto-scheduled in correct order
- [ ] Day view loads in < 3 seconds
- [ ] Adding a task mid-day triggers reshuffle within seconds
- [ ] Push notification fires 15 minutes before a scheduled task
- [ ] Reshuffle notification lists moved tasks
- [ ] Mobile layout works on phone viewport
- [ ] RLS: User A cannot see User B's tasks

## Rules & Requirements
- **Coverage:** Aim for 80%+ on `lib/scheduler.ts` (the core algorithm)
- **Before Commit:** Run `npm run lint` and `npm test`
- **Failures:** NEVER skip tests or mock out assertions to make a pipeline pass. Fix the code.
- **UI verification:** Require browser-based testing before marking UI features complete

## Pre-commit Hooks (set up in Phase 1)
- `npm run lint` — ESLint
- `npm test` — Vitest unit tests
- Optional: `tsc --noEmit` — type checking

## Verification Loop
After each feature:
1. Run `npm test` — fix any failures
2. Run `npm run lint` — fix any warnings
3. Test in browser at `http://localhost:3000`
4. Update `MEMORY.md` with decisions or issues found
5. Check off the feature in `AGENTS.md` roadmap

## Commands
```bash
npm test                    # Run all unit tests
npm test -- scheduler       # Run scheduler tests only
npm run lint                # Lint check
npx tsc --noEmit            # Type check (if configured)
```

## Setup (when project is scaffolded)
```bash
npm install -D vitest @testing-library/react jsdom
# Add "test": "vitest" to package.json scripts
```
