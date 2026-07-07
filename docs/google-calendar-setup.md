# Google Calendar Setup (Step 2.2)

Follow these steps **once** before using calendar sync in the app.

## 1. Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it (e.g. `scheduler-app`) → **Create**

## 2. Enable the Google Calendar API

1. With your project selected, go to **APIs & Services** → **Library**
2. Search for **Google Calendar API**
3. Click it → **Enable**

## 3. Configure the OAuth consent screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (unless you have Google Workspace)
3. Fill in:
   - **App name:** Scheduler
   - **User support email:** your email
   - **Developer contact:** your email
4. Click **Save and Continue**
5. **Scopes:** Add `https://www.googleapis.com/auth/calendar.readonly` → **Save and Continue**
6. **Test users:** Add your Gmail address (required while app is in "Testing" mode)
7. Finish the wizard

## 4. Create OAuth credentials

1. Go to **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Scheduler local` (or similar)
5. **Authorized redirect URIs** — add:
   ```
   http://localhost:3000/api/google-calendar/callback
   ```
6. Click **Create**
7. Copy the **Client ID** and **Client secret**

## 5. Add environment variables

In your `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Restart `npm run dev` after saving.

## 6. Run the database migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Paste the contents of `supabase/migrations/002_google_calendar.sql`
3. Click **Run**

## 7. Connect in the app

1. Sign in to Scheduler at `http://localhost:3000`
2. Click **Connect Google Calendar** on the home page
3. Approve the Google permission screen (read-only calendar access)
4. You’ll return to the app with a success message
5. Click **Sync now** — today’s timed events import as **fixed** tasks

## Production (Vercel, later)

Add to Vercel env vars and Google redirect URI:

```
https://your-app.vercel.app/api/google-calendar/callback
```

Set `NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `redirect_uri_mismatch` | Redirect URI in Google Console must match exactly (no trailing slash) |
| `access_denied` | Add your Gmail as a test user on the OAuth consent screen |
| No events imported | Only **timed** events sync (not all-day). Check events exist today. |
| Token errors after deploy | Update `NEXT_PUBLIC_SITE_URL` and redirect URI for production |

## What sync does (MVP)

- **Read-only** — never writes to Google Calendar
- Imports **today’s timed events** from your primary calendar
- Maps each event → a **fixed** task with `google_event_id` (no duplicates on re-sync)
- Manual fixed/flexible tasks still work alongside imported events
