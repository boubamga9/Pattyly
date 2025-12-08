-- Migration: Add used column to admin_otp_codes table
-- This column tracks whether an OTP code has been used for authentication

-- Add used column with default false
ALTER TABLE admin_otp_codes 
ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for faster lookups of unused codes
CREATE INDEX IF NOT EXISTS idx_admin_otp_codes_used ON admin_otp_codes(used) WHERE used = false;

-- Add comment
COMMENT ON COLUMN admin_otp_codes.used IS 'Whether this OTP code has been used for authentication';



