-- Complete Patisserie Platform Schema
-- Single migration file combining all database setup

-- ===== ENUMS =====

-- User roles
CREATE TYPE user_role AS ENUM ('pastry_chef', 'admin');

-- Subscription status (simplified for MVP)
CREATE TYPE subscription_status AS ENUM ('active', 'inactive');

-- Form field types
CREATE TYPE form_field_type AS ENUM (
  'short-text',
  'long-text', 
  'number',
  'single-select',
  'multi-select'
);

-- Order status
CREATE TYPE order_status AS ENUM (
  'pending',
  'quoted',
  'confirmed',
  'ready',
  'refused',
  'completed'
);

-- Who refused the order
CREATE TYPE refused_by AS ENUM ('pastry_chef', 'client');

-- ===== TABLES =====

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  role user_role DEFAULT 'pastry_chef',
  is_stripe_free BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe customers
CREATE TABLE stripe_customers (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User products (subscriptions)
CREATE TABLE user_products (
  profile_id UUID NOT NULL,
  stripe_product_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  subscription_status subscription_status DEFAULT 'inactive',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_products_pkey PRIMARY KEY (profile_id, stripe_product_id),
  CONSTRAINT user_products_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_products_profile_id_unique UNIQUE (profile_id)
);

-- Stripe Connect accounts
CREATE TABLE stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_account_id TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shops
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 50),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]{3,20}$'),
  bio TEXT CHECK (char_length(bio) <= 500),
  logo_url TEXT,
  is_custom_accepted BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forms
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  is_custom_form BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 50),
  description TEXT CHECK (char_length(description) <= 1000),
  image_url TEXT,
  base_price NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
  min_days_notice INTEGER NOT NULL DEFAULT 0 CHECK (min_days_notice >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Form fields
CREATE TABLE form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL CHECK (char_length(label) <= 100),
  type form_field_type NOT NULL,
  options JSONB, -- Array of options with label and optional price
  required BOOLEAN DEFAULT FALSE,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- null for custom requests
  customer_name TEXT NOT NULL CHECK (char_length(customer_name) >= 2 AND char_length(customer_name) <= 50),
  customer_email TEXT NOT NULL CHECK (customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  pickup_date DATE NOT NULL,
  message TEXT CHECK (char_length(message) <= 500),
  customization_data JSONB, -- Answers to the customization form
  status order_status DEFAULT 'pending',
  refused_by refused_by,
  price NUMERIC(10,2) CHECK (price >= 0),
  chef_message TEXT CHECK (char_length(chef_message) <= 300),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availabilities
CREATE TABLE availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  day INTEGER NOT NULL CHECK (day >= 0 AND day <= 6), -- 0 = Sunday, 6 = Saturday
  is_open BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, day)
);

-- Unavailabilities
CREATE TABLE unavailabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact messages
CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  subject TEXT NOT NULL CHECK (char_length(subject) <= 200),
  body TEXT NOT NULL CHECK (char_length(body) <= 2000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== INDEXES =====

-- Performance indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_shops_slug ON shops(slug);
CREATE INDEX idx_shops_profile_id ON shops(profile_id);
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_pickup_date ON orders(pickup_date);
CREATE INDEX idx_form_fields_form_id ON form_fields(form_id);
CREATE INDEX idx_form_fields_order ON form_fields(form_id, "order");
CREATE INDEX idx_availabilities_shop_id ON availabilities(shop_id);
CREATE INDEX idx_unavailabilities_shop_id ON unavailabilities(shop_id);
CREATE INDEX idx_unavailabilities_dates ON unavailabilities(start_date, end_date);

-- ===== ROW LEVEL SECURITY (RLS) =====

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE unavailabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Stripe customers policies (server-side only)
CREATE POLICY "Stripe customers server access" ON stripe_customers
  FOR ALL USING (false); -- Only accessible via server-side functions

-- User products policies
CREATE POLICY "Users can view own subscriptions" ON user_products
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Server can manage subscriptions" ON user_products
  FOR ALL USING (false); -- Only accessible via server-side functions

-- Stripe Connect accounts policies
CREATE POLICY "Users can view own connect account" ON stripe_connect_accounts
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Server can manage connect accounts" ON stripe_connect_accounts
  FOR ALL USING (false); -- Only accessible via server-side functions

-- Shops policies
CREATE POLICY "Users can view own shop" ON shops
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own shop" ON shops
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own shop" ON shops
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Public can view active shops" ON shops
  FOR SELECT USING (is_active = true);

-- Categories policies
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
  );

CREATE POLICY "Users can manage own categories" ON categories
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
  );

CREATE POLICY "Public can view categories of active shops" ON categories
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE is_active = true)
  );

-- Products policies
CREATE POLICY "Users can view own products" ON products
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
  );

CREATE POLICY "Users can manage own products" ON products
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
  );

CREATE POLICY "Public can view products of active shops" ON products
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE is_active = true)
  );

-- Forms policies
CREATE POLICY "Users can view own forms" ON forms
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
  );

CREATE POLICY "Users can manage own forms" ON forms
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
  );

-- Form fields policies
CREATE POLICY "Users can view own form fields" ON form_fields
  FOR SELECT USING (
    form_id IN (
      SELECT id FROM forms 
      WHERE shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage own form fields" ON form_fields
  FOR ALL USING (
    form_id IN (
      SELECT id FROM forms 
      WHERE shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
    )
  );

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
  );

CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
  );

CREATE POLICY "Public can create orders" ON orders
  FOR INSERT WITH CHECK (true); -- Anyone can create orders

-- Availabilities policies
CREATE POLICY "Users can view own availabilities" ON availabilities
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
  );

CREATE POLICY "Users can manage own availabilities" ON availabilities
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
  );

CREATE POLICY "Public can view availabilities of active shops" ON availabilities
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE is_active = true)
  );

-- Unavailabilities policies
CREATE POLICY "Users can view own unavailabilities" ON unavailabilities
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
  );

CREATE POLICY "Users can manage own unavailabilities" ON unavailabilities
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE profile_id = auth.uid())
  );

CREATE POLICY "Public can view unavailabilities of active shops" ON unavailabilities
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE is_active = true)
  );

-- Contact messages policies (server-side only)
CREATE POLICY "Contact messages server access" ON contact_messages
  FOR ALL USING (false); -- Only accessible via server-side functions

-- ===== TRIGGERS =====

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_stripe_free)
  VALUES (new.id, new.email, 'pastry_chef', false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON stripe_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_products_updated_at BEFORE UPDATE ON user_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stripe_connect_accounts_updated_at BEFORE UPDATE ON stripe_connect_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_form_fields_updated_at BEFORE UPDATE ON form_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_availabilities_updated_at BEFORE UPDATE ON availabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_unavailabilities_updated_at BEFORE UPDATE ON unavailabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_messages_updated_at BEFORE UPDATE ON contact_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== FUNCTIONS =====

-- Function to check if user has password set
CREATE OR REPLACE FUNCTION public.user_password_set()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND length(auth.users.encrypted_password) > 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION get_user_plan(user_profile_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role_val user_role;
  is_stripe_free_val BOOLEAN;
  subscription_status_val subscription_status;
BEGIN
  -- Get user role and stripe exemption
  SELECT p.role, p.is_stripe_free 
  INTO user_role_val, is_stripe_free_val
  FROM profiles p
  WHERE p.id = user_profile_id;
  
  IF user_role_val = 'admin' THEN
    RETURN 'admin';
  END IF;
  
  IF is_stripe_free_val THEN
    RETURN 'exempt';
  END IF;
  
  -- Check subscription
  SELECT up.subscription_status 
  INTO subscription_status_val
  FROM user_products up
  WHERE up.profile_id = user_profile_id 
    AND up.subscription_status = 'active'
  LIMIT 1;
  
  IF subscription_status_val = 'active' THEN
    RETURN 'active';
  END IF;
  
  RETURN 'none';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== COMMENTS =====

COMMENT ON TABLE profiles IS 'User profiles extending auth.users';
COMMENT ON TABLE stripe_customers IS 'Stripe customer accounts for users';
COMMENT ON TABLE user_products IS 'User subscriptions to platform plans';
COMMENT ON TABLE stripe_connect_accounts IS 'Stripe Connect accounts for receiving payments';
COMMENT ON TABLE shops IS 'Pastry chef shops';
COMMENT ON TABLE categories IS 'Product categories per shop';
COMMENT ON TABLE products IS 'Products offered by shops';
COMMENT ON TABLE forms IS 'Customization forms for products';
COMMENT ON TABLE form_fields IS 'Fields within customization forms';
COMMENT ON TABLE orders IS 'Customer orders';
COMMENT ON TABLE availabilities IS 'Shop availability by day of week';
COMMENT ON TABLE unavailabilities IS 'Shop unavailability periods';
COMMENT ON TABLE contact_messages IS 'Contact form submissions'; 