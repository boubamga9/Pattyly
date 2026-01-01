-- Migration: Add Stripe Connect support
-- This migration adds support for Stripe Connect as a payment method
-- alongside PayPal and Revolut

-- 1. Update payment_links constraint to include 'stripe'
ALTER TABLE payment_links 
DROP CONSTRAINT IF EXISTS payment_links_provider_type_check;

ALTER TABLE payment_links 
ADD CONSTRAINT payment_links_provider_type_check 
CHECK (provider_type = ANY (ARRAY['paypal'::text, 'revolut'::text, 'stripe'::text]));

-- 2. Update shop_transfers constraint to include 'stripe'
ALTER TABLE shop_transfers 
DROP CONSTRAINT IF EXISTS shop_transfers_provider_type_check;

ALTER TABLE shop_transfers 
ADD CONSTRAINT shop_transfers_provider_type_check 
CHECK (provider_type = ANY (ARRAY['paypal'::text, 'revolut'::text, 'stripe'::text]));

-- 3. Create stripe_connect_accounts table
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_account_id TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT false,
    charges_enabled BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,
    details_submitted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id) -- Un seul compte Stripe Connect par profil
);

-- Indexes for frequent queries
CREATE INDEX idx_stripe_connect_profile_id ON stripe_connect_accounts(profile_id);
CREATE INDEX idx_stripe_connect_account_id ON stripe_connect_accounts(stripe_account_id);
CREATE INDEX idx_stripe_connect_is_active ON stripe_connect_accounts(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_stripe_connect_accounts_updated_at
    BEFORE UPDATE ON stripe_connect_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stripe connect accounts"
    ON stripe_connect_accounts FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own stripe connect accounts"
    ON stripe_connect_accounts FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own stripe connect accounts"
    ON stripe_connect_accounts FOR UPDATE
    USING (auth.uid() = profile_id);

-- Comments
COMMENT ON TABLE stripe_connect_accounts IS 'Stripe Connect accounts for pastry chefs';
COMMENT ON COLUMN stripe_connect_accounts.stripe_account_id IS 'Stripe Connect Express account ID';
COMMENT ON COLUMN stripe_connect_accounts.is_active IS 'Whether the account is active and can receive payments';
COMMENT ON COLUMN stripe_connect_accounts.charges_enabled IS 'Whether charges are enabled on the Stripe account';
COMMENT ON COLUMN stripe_connect_accounts.payouts_enabled IS 'Whether payouts are enabled on the Stripe account';
COMMENT ON COLUMN stripe_connect_accounts.details_submitted IS 'Whether the account details have been submitted to Stripe';


