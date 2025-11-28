-- Migration: Create events table for analytics and admin_otp_codes table for OTP authentication
-- This enables tracking of user actions and admin dashboard access

-- Create events table for analytics
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    event_name TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Enable RLS for events (read-only for authenticated, insert for authenticated and anonymous)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read events"
ON events FOR SELECT
TO authenticated
USING (TRUE);

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

-- Create admin_otp_codes table for OTP authentication
CREATE TABLE admin_otp_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_admin_otp_codes_email ON admin_otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_admin_otp_codes_expires_at ON admin_otp_codes(expires_at);

-- Enable RLS for admin_otp_codes (only service_role can manage)
ALTER TABLE admin_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role to manage admin_otp_codes"
ON admin_otp_codes FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- Add comments
COMMENT ON TABLE events IS 'Analytics events table for tracking user actions and page views';
COMMENT ON TABLE admin_otp_codes IS 'One-time password codes for admin dashboard authentication';

