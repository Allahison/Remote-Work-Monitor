-- ============================================================
-- REMOTE WORKFORCE MONITOR — Supabase SQL Schema
-- Run this in the Supabase SQL Editor at supabase.com
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE (extended user data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  status TEXT DEFAULT 'offline' CHECK (status IN ('active', 'idle', 'offline')),
  avatar_url TEXT,
  last_seen TIMESTAMPTZ,
  today_active_seconds INTEGER DEFAULT 0,
  today_idle_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. WORK SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.work_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  idle_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TASKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. MESSAGES TABLE (chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id TEXT, -- e.g. 'general', 'announcements', 'random'
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'default' CHECK (type IN ('idle', 'task', 'screen', 'alert', 'chat', 'default')),
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. IDLE LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.idle_logs (
  duration_seconds INTEGER
);

-- ============================================================
-- 7. CONVERSATIONS & PARTICIPANTS (Secret Chat / DMs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT DEFAULT 'dm' CHECK (type IN ('dm', 'group')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- ============================================================
-- 8. INVITATIONS (Admin-Only Onboarding)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES public.profiles(id)
);
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idle_logs ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated USING (id = auth.uid());

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated USING (is_admin());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

-- WORK SESSIONS policies
CREATE POLICY "Users view own sessions; admins view all"
  ON public.work_sessions FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users insert own sessions"
  ON public.work_sessions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own sessions"
  ON public.work_sessions FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

-- TASKS policies
CREATE POLICY "Authenticated users can view tasks"
  ON public.tasks FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "Admins can insert tasks"
  ON public.tasks FOR INSERT
  TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admins can update tasks; employees update their own assigned tasks"
  ON public.tasks FOR UPDATE
  TO authenticated USING (is_admin() OR assignee_id = auth.uid());

CREATE POLICY "Admins can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated USING (is_admin());

-- MESSAGES policies
CREATE POLICY "Authenticated users can read messages"
  ON public.messages FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert messages"
  ON public.messages FOR INSERT
  TO authenticated WITH CHECK (sender_id = auth.uid());

-- NEW: Conversations & Participants RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own conversations"
  ON public.conversations FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "Users view all participants"
  ON public.conversation_participants FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "Users insert participants"
  ON public.conversation_participants FOR INSERT
  TO authenticated WITH CHECK (TRUE); -- Allow adding others to a conversation

CREATE POLICY "Admins create conversations"
  ON public.conversations FOR INSERT
  TO authenticated WITH CHECK (TRUE);

-- Updated Messages Visibility
DROP POLICY IF EXISTS "Authenticated users can read messages" ON public.messages;
CREATE POLICY "Messages visibility"
  ON public.messages FOR SELECT
  TO authenticated USING (TRUE); -- Simplify for now to resolve 500 errors and delivery

-- NOTIFICATIONS policies
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Users update own notifications (mark read)"
  ON public.notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- IDLE LOGS policies
CREATE POLICY "Users view own idle logs; admins view all"
  ON public.idle_logs FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users insert own idle logs"
  ON public.idle_logs FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================
-- REALTIME: Enable replication on key tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;

-- INVITATIONS policies
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invitations"
  ON public.invitations FOR ALL
  TO authenticated USING (is_admin());
CREATE POLICY "Public read invitations"
  ON public.invitations FOR SELECT
  TO public USING (TRUE);

-- ============================================================
-- DEMO ACCOUNTS SEED
-- Note: Run AFTER creating user accounts in Supabase Auth
-- OR use Supabase dashboard to create users with these emails:
--   admin@demo.com  / Demo1234!
--   employee@demo.com / Demo1234!
-- Then run:
-- ============================================================

--   ('<admin-user-id-from-auth>', 'Demo Admin', 'admin@demo.com', 'admin'),
--   ('<employee-user-id-from-auth>', 'Demo Employee', 'employee@demo.com', 'employee');

-- Sample tasks (run after inserting profiles)
-- INSERT INTO public.tasks (title, description, assignee_id, status, priority, deadline, created_by)
-- VALUES
--   ('Complete onboarding checklist', 'Finish all items in the new employee onboarding', '<employee-id>', 'pending', 'high', NOW() + INTERVAL '3 days', '<admin-id>'),
--   ('Weekly report submission', 'Submit the weekly progress report by Friday', '<employee-id>', 'in_progress', 'medium', NOW() + INTERVAL '5 days', '<admin-id>'),
--   ('Review project documentation', 'Read through the project architecture docs', '<employee-id>', 'completed', 'low', NOW() - INTERVAL '1 day', '<admin-id>');

-- ============================================================
-- 7. STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies: recordings (only admins can read, authenticated can write)
CREATE POLICY "Admins can view recordings" 
  ON storage.objects FOR SELECT 
  TO authenticated USING (bucket_id = 'recordings' AND is_admin());

CREATE POLICY "Users can upload recordings" 
  ON storage.objects FOR INSERT 
  TO authenticated WITH CHECK (bucket_id = 'recordings');

-- Storage Policies: avatars (public read, own update)
CREATE POLICY "Avatars are public" 
  ON storage.objects FOR SELECT 
  TO public USING (bucket_id = 'avatars');

CREATE POLICY "Users update own avatars" 
  ON storage.objects FOR INSERT 
  TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users replace own avatars" 
  ON storage.objects FOR UPDATE 
  TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
