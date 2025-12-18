-- Migration: Create shop_policies table
-- This follows the same pattern as shop_customizations for consistency

-- Create shop_policies table
CREATE TABLE shop_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    terms_and_conditions TEXT,
    return_policy TEXT,
    delivery_policy TEXT,
    payment_terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shop_id)
);

-- Add constraints for text length (max 5000 characters per field)
ALTER TABLE shop_policies
ADD CONSTRAINT shop_policies_terms_and_conditions_check CHECK (
    terms_and_conditions IS NULL OR char_length(terms_and_conditions) <= 5000
),
ADD CONSTRAINT shop_policies_return_policy_check CHECK (
    return_policy IS NULL OR char_length(return_policy) <= 5000
),
ADD CONSTRAINT shop_policies_delivery_policy_check CHECK (
    delivery_policy IS NULL OR char_length(delivery_policy) <= 5000
),
ADD CONSTRAINT shop_policies_payment_terms_check CHECK (
    payment_terms IS NULL OR char_length(payment_terms) <= 5000
);

-- Add comments for documentation
COMMENT ON TABLE shop_policies IS 'Politiques de ventes des boutiques';
COMMENT ON COLUMN shop_policies.terms_and_conditions IS 'Conditions générales de vente de la boutique';
COMMENT ON COLUMN shop_policies.return_policy IS 'Politique de retour et remboursement';
COMMENT ON COLUMN shop_policies.delivery_policy IS 'Politique de livraison et retrait';
COMMENT ON COLUMN shop_policies.payment_terms IS 'Conditions de paiement';

-- Add RLS policies
ALTER TABLE shop_policies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own shop policies
CREATE POLICY "Users can access their own shop policies" ON shop_policies
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE profile_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON shop_policies TO authenticated;

-- Create function to automatically create policies when a shop is created
CREATE OR REPLACE FUNCTION create_default_shop_policies()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO shop_policies (shop_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create policies for new shops
CREATE TRIGGER create_shop_policies_trigger
    AFTER INSERT ON shops
    FOR EACH ROW
    EXECUTE FUNCTION create_default_shop_policies();

-- Create default policies for existing shops (empty policies)
INSERT INTO shop_policies (shop_id)
SELECT id FROM shops
WHERE id NOT IN (SELECT shop_id FROM shop_policies);

