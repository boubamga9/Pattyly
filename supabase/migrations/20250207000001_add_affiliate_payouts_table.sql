-- Table pour stocker les paiements mensuels d'affiliation
CREATE TABLE IF NOT EXISTS "affiliate_payouts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "referrer_profile_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "stripe_transfer_id" TEXT NOT NULL UNIQUE,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT DEFAULT 'eur',
  "commission_count" INTEGER NOT NULL,
  "period_start" TIMESTAMPTZ NOT NULL,
  "period_end" TIMESTAMPTZ NOT NULL,
  "paid_at" TIMESTAMPTZ NOT NULL,
  "email_sent" BOOLEAN DEFAULT false,
  "email_sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_referrer ON affiliate_payouts(referrer_profile_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_paid_at ON affiliate_payouts(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_stripe_transfer ON affiliate_payouts(stripe_transfer_id);

-- Trigger pour updated_at
CREATE TRIGGER update_affiliate_payouts_updated_at
    BEFORE UPDATE ON affiliate_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payouts"
    ON affiliate_payouts FOR SELECT
    USING (auth.uid() = referrer_profile_id);

