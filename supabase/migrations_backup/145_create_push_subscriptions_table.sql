-- Migration: Create push_subscriptions table for pastry chefs
-- Description: Store push notification subscriptions for authenticated pastry chefs only

-- Table to store push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure unique subscription per user/endpoint combination
    CONSTRAINT unique_user_endpoint UNIQUE (profile_id, endpoint)
);

-- Index for faster lookups by profile_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_profile_id ON push_subscriptions(profile_id);

-- Index for faster lookups by endpoint
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_push_subscriptions_updated_at 
    BEFORE UPDATE ON push_subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies: Only authenticated pastry chefs can manage their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscriptions
-- Using (select auth.uid()) to avoid re-evaluation for each row (performance optimization)
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
    FOR SELECT USING ((select auth.uid()) = profile_id);

-- Policy: Users can insert their own subscriptions
-- Using (select auth.uid()) to avoid re-evaluation for each row (performance optimization)
CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK ((select auth.uid()) = profile_id);

-- Policy: Users can update their own subscriptions
-- Using (select auth.uid()) to avoid re-evaluation for each row (performance optimization)
CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
    FOR UPDATE USING ((select auth.uid()) = profile_id);

-- Policy: Users can delete their own subscriptions
-- Using (select auth.uid()) to avoid re-evaluation for each row (performance optimization)
CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
    FOR DELETE USING ((select auth.uid()) = profile_id);

-- Note: service_role bypasses RLS by default, so no separate policy needed for server operations
-- The server can manage all subscriptions without needing an explicit policy

COMMENT ON TABLE push_subscriptions IS 'Push notification subscriptions for pastry chefs. Only authenticated users can subscribe.';
