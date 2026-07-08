-- Persist manual schedule overrides so auto-reshuffle does not move them

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS manual_lock BOOLEAN NOT NULL DEFAULT false;
