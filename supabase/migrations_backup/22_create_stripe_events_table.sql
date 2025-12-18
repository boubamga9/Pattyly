-- Create stripe_events table for webhook idempotence
CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on created_at for potential cleanup queries
CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON stripe_events(created_at);

-- Add comment explaining the table purpose
COMMENT ON TABLE stripe_events IS 'Stores processed Stripe webhook event IDs to prevent duplicate processing';
