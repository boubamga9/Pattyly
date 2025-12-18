-- Migration: Fix RLS policies for events table
-- Allow authenticated and anonymous users to insert events for analytics tracking

-- Drop existing insert policies (if they exist)
DROP POLICY IF EXISTS "Allow service role to insert events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to insert events" ON events;
DROP POLICY IF EXISTS "Allow anonymous users to insert events" ON events;

-- Recreate service role policy
CREATE POLICY "Allow service role to insert events"
ON events FOR INSERT
TO service_role
WITH CHECK (TRUE);

-- Allow authenticated users to insert their own events
CREATE POLICY "Allow authenticated users to insert events"
ON events FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Allow anonymous users to insert events (for page_view tracking)
CREATE POLICY "Allow anonymous users to insert events"
ON events FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

