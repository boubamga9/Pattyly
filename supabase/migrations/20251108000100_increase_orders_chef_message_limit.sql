-- Increase orders.chef_message length constraint to 500 characters
ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_chef_message_check;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_chef_message_check CHECK (char_length(chef_message) <= 500);

