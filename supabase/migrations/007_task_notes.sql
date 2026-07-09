-- Optional scheduling hints in plain language (e.g. "evenings only after uni").
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS notes TEXT;
