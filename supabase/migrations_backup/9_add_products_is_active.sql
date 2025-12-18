-- Add is_active column to products table
-- Check if column exists to avoid errors on re-run
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'products' and column_name = 'is_active'
  ) then
    alter table products add column is_active boolean default true;
  end if;
end $$;

-- Create index for better performance (if not exists)
create index if not exists idx_products_is_active on products(is_active);

-- Update existing products to be active by default
update products set is_active = true where is_active is null; 