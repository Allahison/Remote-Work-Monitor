-- ============================================================
-- ADVANCED TASKS: SUBTASKS SCHEMA
-- Run this script in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at for subtasks
CREATE TRIGGER subtasks_updated_at
  BEFORE UPDATE ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Allow Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.subtasks;

-- RLS Policies
-- Subtasks visibility follows the parent task visibility (Admin sees all, Employee sees assigned). 
-- Since we do not have a robust user link here, we use a simple policy where authenticated users can view subtasks:
CREATE POLICY "Users can view subtasks"
  ON public.subtasks FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "Users can insert subtasks"
  ON public.subtasks FOR INSERT
  TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Users can update subtasks"
  ON public.subtasks FOR UPDATE
  TO authenticated USING (TRUE);

CREATE POLICY "Users can delete subtasks"
  ON public.subtasks FOR DELETE
  TO authenticated USING (TRUE);
