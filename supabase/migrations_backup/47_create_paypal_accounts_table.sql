-- Migration: Create PayPal accounts table for direct payments
-- Description: Allows pastry chefs to connect their PayPal accounts for instant payments

-- Create paypal_accounts table
CREATE TABLE paypal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  paypal_email TEXT,
  paypal_merchant_id TEXT UNIQUE,
  onboarding_status TEXT DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'in_progress', 'completed', 'failed')),
  onboarding_url TEXT,
  tracking_id TEXT UNIQUE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE paypal_accounts IS 'PayPal Marketplace accounts for pastry chefs to receive direct payments';
COMMENT ON COLUMN paypal_accounts.paypal_email IS 'PayPal email address (filled after onboarding)';
COMMENT ON COLUMN paypal_accounts.paypal_merchant_id IS 'PayPal merchant ID (required for direct payments)';
COMMENT ON COLUMN paypal_accounts.onboarding_status IS 'Status of PayPal onboarding process';
COMMENT ON COLUMN paypal_accounts.onboarding_url IS 'URL for PayPal onboarding (temporary)';
COMMENT ON COLUMN paypal_accounts.tracking_id IS 'Tracking ID for PayPal onboarding';
COMMENT ON COLUMN paypal_accounts.is_active IS 'Whether the PayPal account is verified and active';

-- Enable RLS
ALTER TABLE paypal_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can insert their own PayPal account
CREATE POLICY "Users can insert their own PayPal account" ON paypal_accounts
FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Users can view their own PayPal account
CREATE POLICY "Users can view their own PayPal account" ON paypal_accounts
FOR SELECT USING (auth.uid() = profile_id);

-- Users can update their own PayPal account
CREATE POLICY "Users can update their own PayPal account" ON paypal_accounts
FOR UPDATE USING (auth.uid() = profile_id);

-- Users can delete their own PayPal account
CREATE POLICY "Users can delete their own PayPal account" ON paypal_accounts
FOR DELETE USING (auth.uid() = profile_id);

-- Server can manage all PayPal accounts (for service role)
CREATE POLICY "Server can manage PayPal accounts" ON paypal_accounts
FOR ALL USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_paypal_accounts_updated_at 
BEFORE UPDATE ON paypal_accounts 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Create function to get PayPal account for a shop
-- This allows the API to access paypal_accounts without exposing RLS policies
CREATE OR REPLACE FUNCTION public.get_paypal_account_for_shop(shop_uuid UUID)
RETURNS TABLE(paypal_merchant_id TEXT, paypal_email TEXT, is_active BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT pa.paypal_merchant_id, pa.paypal_email, pa.is_active
  FROM paypal_accounts pa
  JOIN shops s ON s.profile_id = pa.profile_id
  WHERE s.id = shop_uuid
    AND s.is_active = true
    AND pa.is_active = true
    AND pa.onboarding_status = 'completed'
    AND pa.paypal_merchant_id IS NOT NULL;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_paypal_account_for_shop(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_paypal_account_for_shop(UUID) TO anon;

-- Add PayPal payment columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS paypal_payment_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_capture_id TEXT;

-- Add comments for the new columns
COMMENT ON COLUMN orders.paypal_payment_id IS 'PayPal payment ID for tracking';
COMMENT ON COLUMN orders.paypal_order_id IS 'PayPal order ID from checkout';
COMMENT ON COLUMN orders.paypal_capture_id IS 'PayPal capture ID when payment is completed';
