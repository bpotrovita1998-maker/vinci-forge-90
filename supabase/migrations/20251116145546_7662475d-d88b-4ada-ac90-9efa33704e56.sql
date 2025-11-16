-- Fix security vulnerability in user_files table INSERT policy
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Service can insert files" ON public.user_files;

-- Create secure INSERT policy that restricts users to only insert their own files
CREATE POLICY "Users can insert their own files"
ON public.user_files
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);