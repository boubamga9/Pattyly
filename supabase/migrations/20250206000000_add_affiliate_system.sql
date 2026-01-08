-- Migration: Add affiliate system
-- Utilise le slug de la boutique comme code d'affiliation

-- Table pour tracker les affiliations (qui a parrainé qui)
CREATE TABLE IF NOT EXISTS "affiliations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "referrer_profile_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "referred_profile_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "affiliate_slug" TEXT NOT NULL,
  "subscription_started_at" TIMESTAMPTZ,
  "commission_rate" DECIMAL(5,2) DEFAULT 30.00,
  "commission_duration_months" INTEGER DEFAULT 3,
  "status" TEXT DEFAULT 'pending',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("referred_profile_id")
);

-- Table pour tracker les commissions gagnées et payées
CREATE TABLE IF NOT EXISTS "affiliate_commissions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "affiliation_id" UUID NOT NULL REFERENCES "affiliations"("id") ON DELETE CASCADE,
  "referrer_profile_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "referred_profile_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "subscription_period_start" TIMESTAMPTZ NOT NULL,
  "subscription_period_end" TIMESTAMPTZ NOT NULL,
  "subscription_amount" DECIMAL(10,2) NOT NULL,
  "commission_amount" DECIMAL(10,2) NOT NULL,
  "stripe_invoice_id" TEXT,
  "stripe_transfer_id" TEXT,
  "stripe_connect_account_id" TEXT,
  "status" TEXT DEFAULT 'pending',
  "paid_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour les performances
CREATE INDEX idx_affiliations_referrer ON affiliations(referrer_profile_id);
CREATE INDEX idx_affiliations_referred ON affiliations(referred_profile_id);
CREATE INDEX idx_affiliations_slug ON affiliations(affiliate_slug);
CREATE INDEX idx_affiliations_status ON affiliations(status);
CREATE INDEX idx_affiliate_commissions_referrer ON affiliate_commissions(referrer_profile_id);
CREATE INDEX idx_affiliate_commissions_status ON affiliate_commissions(status);
CREATE INDEX idx_affiliate_commissions_affiliation ON affiliate_commissions(affiliation_id);

-- Trigger pour updated_at
CREATE TRIGGER update_affiliations_updated_at
    BEFORE UPDATE ON affiliations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE affiliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own affiliations as referrer"
    ON affiliations FOR SELECT
    USING (auth.uid() = referrer_profile_id);

CREATE POLICY "Users can view their own affiliation as referred"
    ON affiliations FOR SELECT
    USING (auth.uid() = referred_profile_id);

CREATE POLICY "Users can view their own commissions"
    ON affiliate_commissions FOR SELECT
    USING (auth.uid() = referrer_profile_id);

-- Comments
COMMENT ON TABLE affiliations IS 'Affiliation relationships between pastry chefs';
COMMENT ON COLUMN affiliations.referrer_profile_id IS 'The pastry chef who shared the affiliate link';
COMMENT ON COLUMN affiliations.referred_profile_id IS 'The pastry chef who signed up using the affiliate link';
COMMENT ON COLUMN affiliations.affiliate_slug IS 'The shop slug used as affiliate code';
COMMENT ON COLUMN affiliations.status IS 'pending, active, expired, cancelled';
COMMENT ON TABLE affiliate_commissions IS 'Commissions earned from affiliate referrals';
COMMENT ON COLUMN affiliate_commissions.status IS 'pending, paid, failed, cancelled';


