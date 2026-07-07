# Supabase Setup

## 1. Run the migration

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project → **SQL Editor** → **New query**
3. Paste the contents of `migrations/001_create_tasks.sql`
4. Click **Run**

You should see `Success. No rows returned`.

## 2. Verify RLS (after auth is wired in Step 3)

In **Table Editor → tasks**, confirm Row Level Security is enabled and four policies exist.

## 3. Environment variables

Copy `.env.local.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Get both from **Project Settings → API**.

## 4. Auth redirect URLs (for email confirmation)

In **Authentication → URL Configuration**, add:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000/auth/callback`

For production, add your Vercel URL too (e.g. `https://your-app.vercel.app/auth/callback`).
