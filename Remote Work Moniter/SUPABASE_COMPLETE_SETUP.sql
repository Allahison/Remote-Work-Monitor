-- ============================================================
-- 🏢 REMOTE WORK MONITOR — COMPLETE MASTER SCHEMA
-- ============================================================
-- PURPOSE: This script sets up the entire database in one go.
-- INSTRUCTIONS: Run this in the Supabase SQL Editor (supabase.com).
-- ============================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Main Tables & Structures (In Order of Dependency)
-- ============================================================

-- A. Profiles (Extended User Data) - Dependency for almost everything
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

-- B. Conversations (Parent of Messages)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT DEFAULT 'dm' CHECK (type IN ('dm', 'group')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. Conversation Participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- D. Messages (Chat)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id TEXT, -- e.g. 'general', 'announcements'
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E. Tasks & Subtasks
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

CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. Work Sessions
CREATE TABLE IF NOT EXISTS public.work_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  idle_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- G. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'default' CHECK (type IN ('idle', 'task', 'screen', 'alert', 'chat', 'default')),
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- H. Leaves & Attendance
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

-- I. Video Calls (Signaling)
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'offer', 'answer', 'candidate', 'hangup'
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- J. Invitations (Onboarding)
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES public.profiles(id)
);

-- K. Idle Logs (Metadata)
CREATE TABLE IF NOT EXISTS public.idle_logs (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Functions & Triggers
-- ============================================================

-- Update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subtasks_updated_at BEFORE UPDATE ON public.subtasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leaves_updated_at BEFORE UPDATE ON public.leaves FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Admin Helper Function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Row Level Security (RLS) Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, own/admin update
CREATE POLICY "Profiles are viewable by all authenticated" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Work Sessions: Own read/write, Admin read all
CREATE POLICY "Users view own sessions" ON public.work_sessions FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Users insert own sessions" ON public.work_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own sessions" ON public.work_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Tasks & Subtasks
CREATE POLICY "Authenticated users view tasks" ON public.tasks FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins manage tasks" ON public.tasks FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Employees update assigned tasks" ON public.tasks FOR UPDATE TO authenticated USING (assignee_id = auth.uid());
CREATE POLICY "Users manage relevant subtasks" ON public.subtasks FOR ALL TO authenticated USING (TRUE);

-- Messages & Conversations
CREATE POLICY "Messages visibility" ON public.messages FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Messages insertion" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Conversations visibility" ON public.conversations FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Participants management" ON public.conversation_participants FOR ALL TO authenticated USING (TRUE);

-- Notifications
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Leaves
CREATE POLICY "Users view own leaves; admins view all" ON public.leaves FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Users manage own pending leaves" ON public.leaves FOR ALL TO authenticated USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admins manage all leaves" ON public.leaves FOR ALL TO authenticated USING (is_admin());

-- Video Calls (Signaling)
CREATE POLICY "Call signaling" ON public.calls FOR ALL TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR channel_id IS NOT NULL);

-- Invitations
CREATE POLICY "Admins manage invitations" ON public.invitations FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Public read invitations" ON public.invitations FOR SELECT TO public USING (TRUE);

-- 5. Realtime Replication
-- ============================================================
BEGIN;
  -- Enable Realtime for the publication
  -- (Will create publication if it doesn't exist, and add tables)
  DO $$ 
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;
  
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles, public.tasks, public.messages, public.notifications, public.conversations, public.conversation_participants, public.invitations, public.leaves, public.calls, public.subtasks;
COMMIT;

-- 6. Storage Buckets & Policies
-- ============================================================

-- Buckets creation (if not exists)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_attachments', 'chat_attachments', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', false) ON CONFLICT (id) DO NOTHING;

-- Policies for Avatars
CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Users manage own avatars" ON storage.objects FOR ALL TO authenticated 
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policies for Chat Attachments
CREATE POLICY "Attachments public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'chat_attachments');
CREATE POLICY "Authenticated upload attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat_attachments');
CREATE POLICY "Users delete own attachments" ON storage.objects FOR DELETE TO authenticated 
  USING (bucket_id = 'chat_attachments' AND auth.uid() = owner);

-- Policies for Recordings (Admin only read)
CREATE POLICY "Admins read recordings" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'recordings' AND is_admin());
CREATE POLICY "Users upload recordings" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'recordings');

-- ============================================================
-- END MASTER SCHEMA
-- ============================================================
