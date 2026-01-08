-- Migration: Add use_for_orders field to stripe_connect_accounts
-- Permet de distinguer l'usage de Stripe Connect pour les commandes vs l'affiliation

-- 1. Ajouter la colonne avec une valeur par défaut true
-- La valeur par défaut s'appliquera automatiquement aux nouvelles lignes
ALTER TABLE stripe_connect_accounts 
ADD COLUMN IF NOT EXISTS use_for_orders BOOLEAN DEFAULT true;

-- 2. IMPORTANT : Mettre à jour explicitement toutes les lignes existantes à true
-- Cela garantit que les comptes déjà activés en prod continueront à fonctionner
-- même si la valeur par défaut ne s'applique qu'aux nouvelles insertions
UPDATE stripe_connect_accounts 
SET use_for_orders = true 
WHERE use_for_orders IS NULL;

-- 3. Optionnel : Ajouter une contrainte NOT NULL pour éviter les valeurs NULL
-- Mais on le fait en deux étapes pour éviter les erreurs si des NULL existent
ALTER TABLE stripe_connect_accounts 
ALTER COLUMN use_for_orders SET NOT NULL;

-- 4. Comment pour la documentation
COMMENT ON COLUMN stripe_connect_accounts.use_for_orders IS 
'Si true, les paiements de commandes sont transférés vers ce compte Stripe Connect. Si false, Stripe Connect est uniquement utilisé pour les commissions d''affiliation.';


