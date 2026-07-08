-- Add a timestamp to prevent duplicate pre-task notifications

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS pre_task_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_pre_task_notified_at
  ON tasks(pre_task_notified_at);

