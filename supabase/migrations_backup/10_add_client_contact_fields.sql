-- Add client contact fields to orders table
ALTER TABLE orders
ADD COLUMN phone TEXT,
ADD COLUMN instagram TEXT;

-- Add comment for documentation
COMMENT ON COLUMN orders.phone IS 'Client phone number (optional)';
COMMENT ON COLUMN orders.instagram IS 'Client Instagram handle (optional)'; 