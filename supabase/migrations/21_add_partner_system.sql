-- Migration 21: Ajout du système de partenariat

-- 1. Ajouter le rôle "partner" dans profiles
ALTER TYPE user_role ADD VALUE 'partner';

-- 2. Créer la table partners
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profiles_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    commission_rate DECIMAL(5,2) DEFAULT 20.00,
    company_name VARCHAR(255) NOT NULL,
    company_tiktok VARCHAR(255),
    company_insta VARCHAR(255),
    company_website VARCHAR(255),
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    total_referrals INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Créer la table referrals
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte : un shop ne peut être parrainé qu'une fois
    UNIQUE(shop_id)
);

-- 4. Créer la table partner_commissions
CREATE TABLE partner_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    month_year DATE NOT NULL,
    subscription_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    stripe_transfer_id VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte : une commission par mois par referral
    UNIQUE(referral_id, month_year),
    -- Contrainte : month_year doit être le premier jour du mois
    CHECK (month_year = DATE_TRUNC('month', month_year)::date)
);

-- 5. Ajouter les index pour les performances
CREATE INDEX idx_partners_profiles_id ON partners(profiles_id);
CREATE INDEX idx_partners_referral_code ON partners(referral_code);
CREATE INDEX idx_partners_status ON partners(status);

CREATE INDEX idx_referrals_partner_id ON referrals(partner_id);
CREATE INDEX idx_referrals_shop_id ON referrals(shop_id);
CREATE INDEX idx_referrals_status ON referrals(status);

CREATE INDEX idx_partner_commissions_referral_id ON partner_commissions(referral_id);
CREATE INDEX idx_partner_commissions_month_year ON partner_commissions(month_year);
CREATE INDEX idx_partner_commissions_status ON partner_commissions(status);

-- 6. Créer la fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Créer le trigger pour updated_at sur partners
CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON partners
    FOR EACH ROW
    EXECUTE FUNCTION update_partners_updated_at(); 