-- ============================================================
-- LEAVE & ATTENDANCE MANAGEMENT SCHEMA
-- Run this script in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'vacation' CHECK (type IN ('sick', 'vacation', 'unpaid', 'personal')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at for leaves
CREATE TRIGGER leaves_updated_at
  BEFORE UPDATE ON public.leaves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- Allow Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaves;

-- Leave Policies
CREATE POLICY "Users view own leaves; admins view all"
  ON public.leaves FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can insert own leaves"
  ON public.leaves FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending leaves; admins update any"
  ON public.leaves FOR UPDATE
  TO authenticated USING (
    is_admin() OR (user_id = auth.uid() AND status = 'pending')
  );

CREATE POLICY "Users can delete own pending leaves"
  ON public.leaves FOR DELETE
  TO authenticated USING (user_id = auth.uid() AND status = 'pending');
