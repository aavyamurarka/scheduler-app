# Scheduler Quick Capture (Chrome Extension, MV3)

This folder contains a **Manifest V3** Chrome extension that lets you highlight text on any page, right-click **Add as task**, and send it to your existing Scheduler backend.

## Setup

1. **Configure Supabase**

Open `extension/config.js` and set:
- `SUPABASE_URL` = your `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` = your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Load unpacked**

- Open `chrome://extensions`
- Enable **Developer mode** (top right)
- Click **Load unpacked**
- Select the `scheduler-app/extension` folder

3. **Use it**

- Highlight any text on a page
- Right-click → **Add as task**
- A small window opens with the title pre-filled
- Sign in (first time only), then save the task

## Notes

- Tasks are created by calling the app endpoint: `POST /api/tasks/create` on `https://schedulerapp-xi.vercel.app`.
- Auth is handled via Supabase password login from the extension, storing the session in `chrome.storage.local`.

