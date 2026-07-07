# Project Brief (Persistent)

- **Product vision:** Turns "I'll get to it later" into "it's already scheduled" — students dump tasks without deciding when, and the app auto-schedules them around fixed commitments.
- **Target audience:** University students who are tech-savvy and comfortable with AI tools; not disorganized, but struggle with decision friction around *when* to do flexible tasks.
- **Launch goal:** Ship a working MVP and learn to build apps end-to-end (success = shipping, not growth numbers).
- **Timeline:** Launch before July 15 (~40 hours / 10 days).
- **Budget:** $0/month operating cost; free tiers only.

## Conventions
- **Naming:** PascalCase for React components, camelCase for functions/utilities, snake_case for database columns
- **File structure:** Feature components in `components/`, business logic in `lib/`, database migrations in `supabase/migrations/`
- **Styling:** Tailwind CSS; neutral backgrounds, one accent color for actionable elements
- **Language:** TypeScript strict mode throughout

## Key Principles
- Ship the simplest solution that solves the user story — greedy scheduling, manual fixed-task entry, OneSignal for notifications
- Google Calendar read sync is **in MVP**; Gmail and Slack remain post-MVP
- Explain before generating for database schema and algorithm work — this is a learning project
- Test each feature in the browser before moving to the next
- Fixed tasks are never moved or overwritten by the scheduler

## Quality Gates
- All P0 features functional end-to-end before launch
- RLS confirmed: one user cannot see another's tasks
- Push notifications fire at T-15 minutes for scheduled tasks
- Mobile-responsive and WCAG 2.1 AA basics
- No placeholder content ("Lorem ipsum") in production
- Pre-commit: run `npm run lint` and `npm test` before commits (set up hooks in Phase 1)

## Key Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run lint         # Check code style
npm test             # Run unit tests (scheduler logic)
npm run build        # Production build
```

## AI Assistance Strategy (Mix — Learning While Building)
| Task Type | Who Leads |
|-----------|-----------|
| Simple UI (buttons, forms, layout) | User tries first, Cursor assists |
| Database schema and queries | Cursor leads, user reviews line by line |
| Scheduling algorithm | Cursor generates first pass, user modifies priority logic |
| Notification integration | Cursor leads (third-party API wiring is fiddly) |
| Debugging | Paste error, ask Cursor to explain before fixing |

## Update Cadence
- Update `MEMORY.md` after every major milestone or architectural decision
- Update `AGENTS.md` roadmap checkboxes as phases complete
- Refresh this brief if conventions change (e.g., adding a state library or test framework)
