-- Migration: Update affiliate commission duration from 3 to 6 months
-- Change the default value for commission_duration_months from 3 to 6

-- Update the default value for new affiliations
ALTER TABLE affiliations 
ALTER COLUMN commission_duration_months SET DEFAULT 6;

-- Optional: Update existing affiliations that still have the old default (3 months)
-- This will only affect affiliations that haven't been customized
-- Uncomment the line below if you want to update existing affiliations too
-- UPDATE affiliations SET commission_duration_months = 6 WHERE commission_duration_months = 3;

