-- ============================================================
-- VIDEO CALLS & HUDDLES SCHEMA (WebRTC Signaling)
-- Run this script in your Supabase SQL Editor
-- ============================================================

-- 1. Create the calls table for signaling
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'offer', 'answer', 'candidate', 'hangup'
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for channel-wide huddles
  channel_id TEXT, -- For huddles (references static channel IDs like 'general')
  data JSONB NOT NULL, -- SDP or ICE candidate info
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- 3. Enable Realtime for the calls table
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;

-- 4. RLS Policies
-- Users can see calls they are involved in or calls in channels they belong to
CREATE POLICY "Users can view relevant calls"
  ON public.calls FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR 
    receiver_id = auth.uid() OR 
    channel_id IS NOT NULL -- For simplicity, allowing channel huddles for all authed
  );

-- Users can insert calls
CREATE POLICY "Users can insert calls"
  ON public.calls FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Optional: Clean up old calls (logic usually handled by server or client hangup)
-- For now, allow deletion by sender
CREATE POLICY "Users can delete own calls"
  ON public.calls FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());
