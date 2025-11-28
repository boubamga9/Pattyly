-- Migration: Add admin_sessions table for secure session management
-- This prevents cookie tampering attacks by storing session tokens in the database

-- Create admin_sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Enable RLS for admin_sessions (only service_role can manage)
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role has full access to admin_sessions"
ON admin_sessions FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- Add comment
COMMENT ON TABLE admin_sessions IS 'Secure admin session tokens stored in database to prevent cookie tampering';

-- Function to cleanup expired sessions (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_admin_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM admin_sessions
    WHERE expires_at < NOW();
END;
$$;

COMMENT ON FUNCTION cleanup_expired_admin_sessions() IS 'Deletes expired admin sessions';


