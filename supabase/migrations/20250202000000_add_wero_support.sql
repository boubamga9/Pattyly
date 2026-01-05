-- Migration pour ajouter le support Wero comme moyen de paiement
-- Cette migration ajoute 'wero' aux types de providers autorisés dans payment_links et shop_transfers

-- 1. Update payment_links constraint to include 'wero'
ALTER TABLE payment_links 
DROP CONSTRAINT IF EXISTS payment_links_provider_type_check;

ALTER TABLE payment_links 
ADD CONSTRAINT payment_links_provider_type_check 
CHECK (provider_type = ANY (ARRAY['paypal'::text, 'revolut'::text, 'stripe'::text, 'wero'::text]));

-- 2. Update shop_transfers constraint to include 'wero'
ALTER TABLE shop_transfers 
DROP CONSTRAINT IF EXISTS shop_transfers_provider_type_check;

ALTER TABLE shop_transfers 
ADD CONSTRAINT shop_transfers_provider_type_check 
CHECK (provider_type = ANY (ARRAY['paypal'::text, 'revolut'::text, 'stripe'::text, 'wero'::text]));

