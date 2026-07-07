-- Scheduler MVP: tasks table with Row-Level Security
-- Run this in Supabase Dashboard → SQL Editor (or via Supabase CLI)

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('fixed', 'flexible')),
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    priority INT CHECK (priority BETWEEN 1 AND 5),
    deadline TIMESTAMPTZ,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_scheduled_start ON tasks(scheduled_start);
