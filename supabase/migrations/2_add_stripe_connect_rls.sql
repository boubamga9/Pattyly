-- Enable RLS on stripe_connect_accounts
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own Stripe Connect accounts
CREATE POLICY "Users can insert their own Stripe Connect accounts" ON stripe_connect_accounts
FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Policy to allow users to view their own Stripe Connect accounts
CREATE POLICY "Users can view their own Stripe Connect accounts" ON stripe_connect_accounts
FOR SELECT USING (auth.uid() = profile_id);

-- Policy to allow users to update their own Stripe Connect accounts
CREATE POLICY "Users can update their own Stripe Connect accounts" ON stripe_connect_accounts
FOR UPDATE USING (auth.uid() = profile_id);

-- Policy to allow users to delete their own Stripe Connect accounts
CREATE POLICY "Users can delete their own Stripe Connect accounts" ON stripe_connect_accounts
FOR DELETE USING (auth.uid() = profile_id); 