-- Migration 75: Migration complète vers le système PayPal.me
-- Cette migration remplace le système PayPal Partner Referrals par PayPal.me

-- ==============================================
-- 1. SUPPRESSION DES TABLES PAYPAL EXISTANTES
-- ==============================================

-- Supprimer les tables PayPal existantes
DROP TABLE IF EXISTS paypal_accounts CASCADE;
DROP TABLE IF EXISTS paypal_events CASCADE;

-- ==============================================
-- 2. CRÉATION DE LA TABLE PAYMENT_LINKS (si elle n'existe pas)
-- ==============================================

CREATE TABLE IF NOT EXISTS payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    paypal_me VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte unique : un profil ne peut avoir qu'un seul paypal_me
    UNIQUE(profile_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_payment_links_profile_id ON payment_links(profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_paypal_me ON payment_links(paypal_me);

-- RLS pour payment_links
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir leurs propres payment_links
DROP POLICY IF EXISTS "Users can view their own payment links" ON payment_links;
CREATE POLICY "Users can view their own payment links" ON payment_links
    FOR SELECT USING (auth.uid() = profile_id);

-- Politique : les utilisateurs peuvent créer leurs propres payment_links
DROP POLICY IF EXISTS "Users can create their own payment links" ON payment_links;
CREATE POLICY "Users can create their own payment links" ON payment_links
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Politique : les utilisateurs peuvent modifier leurs propres payment_links
DROP POLICY IF EXISTS "Users can update their own payment links" ON payment_links;
CREATE POLICY "Users can update their own payment links" ON payment_links
    FOR UPDATE USING (auth.uid() = profile_id);

-- ==============================================
-- 3. MODIFICATION DE LA TABLE ANTI_FRAUD
-- ==============================================

-- Supprimer la colonne merchant_id si elle existe
ALTER TABLE anti_fraud DROP COLUMN IF EXISTS merchant_id;

-- Ajouter la colonne paypal_me
ALTER TABLE anti_fraud ADD COLUMN IF NOT EXISTS paypal_me VARCHAR(255);

-- ==============================================
-- 4. MODIFICATION DES TABLES PENDING_ORDERS ET ORDERS
-- ==============================================

-- Ajouter order_ref à pending_orders
ALTER TABLE pending_orders ADD COLUMN IF NOT EXISTS order_ref VARCHAR(8);

-- Ajouter order_ref à orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_ref VARCHAR(8);

-- Supprimer les colonnes PayPal de orders
ALTER TABLE orders DROP COLUMN IF EXISTS paypal_order_id;
ALTER TABLE orders DROP COLUMN IF EXISTS paypal_capture_id;

-- ==============================================
-- 5. MODIFICATION DE L'ENUM ORDER_STATUS
-- ==============================================

-- Ajouter 'to_verify' à l'enum order_status
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'to_verify';

-- ==============================================
-- 6. MODIFICATION DE LA TABLE SHOPS
-- ==============================================

-- Supprimer la colonne catalog_version
ALTER TABLE shops DROP COLUMN IF EXISTS catalog_version;

-- ==============================================
-- 7. FONCTIONS
-- ==============================================

-- Fonction pour générer une référence de commande unique
CREATE OR REPLACE FUNCTION generate_order_ref()
RETURNS VARCHAR AS $$
DECLARE
    chars CONSTANT VARCHAR := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    result VARCHAR(8);
BEGIN
    LOOP
        result := (
            SELECT string_agg(substr(chars, floor(random() * length(chars) + 1)::integer, 1), '')
            FROM generate_series(1, 8)
        );

        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM pending_orders WHERE order_ref = result
            UNION
            SELECT 1 FROM orders WHERE order_ref = result
        );
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour check_and_create_trial pour utiliser paypal_me au lieu de merchant_id
CREATE OR REPLACE FUNCTION check_and_create_trial(p_paypal_me VARCHAR(255))
RETURNS TABLE (
    is_new_user BOOLEAN,
    trial_remaining_days INTEGER,
    user_plan VARCHAR(20),
    product_count INTEGER
) AS $$
DECLARE
    user_profile_id UUID;
    existing_trial INTEGER;
    trial_days INTEGER := 14; -- 14 jours d'essai
BEGIN
    -- Trouver l'utilisateur par paypal_me
    SELECT profile_id INTO user_profile_id
    FROM anti_fraud
    WHERE paypal_me = p_paypal_me
    LIMIT 1;

    -- Si l'utilisateur n'existe pas, créer un nouvel enregistrement
    IF user_profile_id IS NULL THEN
        -- Créer un nouvel enregistrement anti_fraud
        INSERT INTO anti_fraud (paypal_me, created_at)
        VALUES (p_paypal_me, NOW())
        RETURNING profile_id INTO user_profile_id;
    END IF;

    -- Vérifier s'il y a déjà un essai en cours
    SELECT COUNT(*) INTO existing_trial
    FROM shops
    WHERE profile_id = user_profile_id
    AND stripe_subscription_status = 'trialing';

    -- Si pas d'essai en cours, en créer un
    IF existing_trial = 0 THEN
        -- Créer un shop en mode essai
        INSERT INTO shops (profile_id, name, slug, stripe_subscription_status, trial_ends_at)
        VALUES (
            user_profile_id,
            'Boutique temporaire',
            'temp-' || user_profile_id::text,
            'trialing',
            NOW() + INTERVAL '14 days'
        );
    END IF;

    -- Retourner les informations
    RETURN QUERY
    SELECT 
        (existing_trial = 0) as is_new_user,
        trial_days as trial_remaining_days,
        'trial'::VARCHAR(20) as user_plan,
        (SELECT COUNT(*)::INTEGER FROM products WHERE shop_id IN (
            SELECT id FROM shops WHERE profile_id = user_profile_id
        )) as product_count;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les fonctions obsolètes
DROP FUNCTION IF EXISTS get_stripe_connect_for_shop(UUID);
DROP FUNCTION IF EXISTS get_paypal_account_for_shop(UUID);
DROP FUNCTION IF EXISTS cleanup_old_paypal_events();

-- ==============================================
-- 8. MISE À JOUR DES FONCTIONS EXISTANTES
-- ==============================================

-- Supprimer et recréer get_order_data pour inclure le statut 'to_verify'
DROP FUNCTION IF EXISTS get_order_data(UUID);
CREATE FUNCTION get_order_data(p_shop_id UUID)
RETURNS TABLE (
    id UUID,
    status order_status,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    pickup_date DATE,
    chef_pickup_date DATE,
    chef_message TEXT,
    customization_data JSONB,
    product_name TEXT,
    product_base_price DECIMAL(10,2),
    additional_information TEXT,
    total_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2),
    order_ref VARCHAR(8),
    inspiration_photos TEXT[],
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.status,
        o.customer_name,
        o.customer_email,
        o.customer_phone,
        o.pickup_date,
        o.chef_pickup_date,
        o.chef_message,
        o.customization_data,
        o.product_name,
        o.product_base_price,
        o.additional_information,
        o.total_amount,
        o.paid_amount,
        o.order_ref,
        o.inspiration_photos,
        o.created_at
    FROM orders o
    WHERE o.shop_id = p_shop_id
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Supprimer et recréer get_user_permissions pour utiliser payment_links
DROP FUNCTION IF EXISTS get_user_permissions(UUID);
CREATE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
    can_create_shop BOOLEAN,
    can_accept_orders BOOLEAN,
    has_payment_method BOOLEAN,
    shop_exists BOOLEAN,
    trial_remaining_days INTEGER,
    user_plan VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Peut créer une boutique si aucune n'existe
        NOT EXISTS(SELECT 1 FROM shops WHERE profile_id = p_user_id) as can_create_shop,
        
        -- Peut accepter des commandes si une boutique existe
        EXISTS(SELECT 1 FROM shops WHERE profile_id = p_user_id) as can_accept_orders,
        
        -- A une méthode de paiement si un payment_link existe
        EXISTS(SELECT 1 FROM payment_links WHERE profile_id = p_user_id) as has_payment_method,
        
        -- Boutique existe
        EXISTS(SELECT 1 FROM shops WHERE profile_id = p_user_id) as shop_exists,
        
        -- Jours d'essai restants
        CASE 
            WHEN EXISTS(SELECT 1 FROM shops WHERE profile_id = p_user_id AND stripe_subscription_status = 'trialing') THEN
                EXTRACT(DAY FROM (s.trial_ends_at - NOW()))::INTEGER
            ELSE 0
        END as trial_remaining_days,
        
        -- Plan utilisateur
        CASE 
            WHEN EXISTS(SELECT 1 FROM shops WHERE profile_id = p_user_id AND stripe_subscription_status = 'trialing') THEN 'trial'::VARCHAR(20)
            WHEN EXISTS(SELECT 1 FROM shops WHERE profile_id = p_user_id AND stripe_subscription_status = 'active') THEN 'premium'::VARCHAR(20)
            ELSE 'free'::VARCHAR(20)
        END as user_plan
    FROM shops s
    WHERE s.profile_id = p_user_id
    LIMIT 1;
    
    -- Si aucun shop n'existe, retourner les valeurs par défaut
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            true as can_create_shop,
            false as can_accept_orders,
            false as has_payment_method,
            false as shop_exists,
            0 as trial_remaining_days,
            'free'::VARCHAR(20) as user_plan;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 9. TRIGGER POUR UPDATED_AT
-- ==============================================

-- Trigger pour payment_links
CREATE OR REPLACE FUNCTION update_payment_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_links_updated_at ON payment_links;
CREATE TRIGGER update_payment_links_updated_at
    BEFORE UPDATE ON payment_links
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_links_updated_at();

-- ==============================================
-- 10. COMMENTAIRES
-- ==============================================

COMMENT ON TABLE payment_links IS 'Table pour stocker les liens PayPal.me des pâtissiers';
COMMENT ON COLUMN payment_links.paypal_me IS 'Nom PayPal.me du pâtissier (ex: @monnom)';
COMMENT ON COLUMN pending_orders.order_ref IS 'Référence unique de 8 caractères pour la commande';
COMMENT ON COLUMN orders.order_ref IS 'Référence unique de 8 caractères pour la commande';
COMMENT ON COLUMN anti_fraud.paypal_me IS 'Nom PayPal.me pour identifier l''utilisateur';
COMMENT ON FUNCTION generate_order_ref() IS 'Génère une référence unique de 8 caractères pour les commandes';
