-- Fix bio constraint to match Zod validation (1000 characters)
-- This aligns the database constraint with the frontend validation

-- Drop the existing constraint
ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_bio_check;

-- Add the new constraint with 1000 character limit
ALTER TABLE shops ADD CONSTRAINT shops_bio_check 
CHECK (char_length(bio) <= 1000);
