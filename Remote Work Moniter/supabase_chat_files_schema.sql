-- ============================================================
-- CHAT FILE ATTACHMENTS SCHEMA
-- Run this script in your Supabase SQL Editor
-- ============================================================

-- 1. Add attachment columns to the existing messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- 2. Create the Storage Bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_attachments', 'chat_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set Storage RLS Policies
-- Allow anyone authenticated to upload files
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'chat_attachments');

-- Allow anyone to read the files (since the bucket is public, this is mainly for the API)
CREATE POLICY "Allow public read" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat_attachments');

-- Allow users to delete their own uploaded files
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat_attachments' AND auth.uid() = owner);
