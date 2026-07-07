-- Google Calendar integration: token storage + event deduplication on tasks

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_event_id TEXT;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_user_google_event_key UNIQUE (user_id, google_event_id);

CREATE TABLE google_calendar_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar tokens"
  ON google_calendar_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar tokens"
  ON google_calendar_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar tokens"
  ON google_calendar_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar tokens"
  ON google_calendar_tokens FOR DELETE
  USING (auth.uid() = user_id);
