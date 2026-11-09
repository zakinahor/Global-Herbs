-- ============================================================================
-- GLOBAL HERBS — COMPLETE SUPABASE DATABASE & STORAGE SCHEMA
-- Run this script in your Supabase Project: SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. CUSTOMER PROFILES TABLE (Linked with Supabase auth.users)
-- Supports Two Roles: 'customer' (default) and 'admin'
-- No hardcoded admin credentials; assign admin role dynamically via SQL:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'YOUR_ADMIN_EMAIL@EXAMPLE.COM';
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  phone TEXT DEFAULT '',
  account_type TEXT DEFAULT 'Personal / Recreational',
  delivery_address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  email_verified BOOLEAN DEFAULT false,
  saved_addresses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure role column exists if upgrading an existing table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin'));

-- Helper function to check if current authenticated user has the 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admin can view all" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on Supabase auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, phone, account_type, email_verified, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', NEW.raw_app_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'Personal / Recreational'),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- 3. PRODUCTS CATALOG TABLE (For Private Admin Management & Storefront)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  original_price NUMERIC(10, 2) DEFAULT NULL,
  on_sale BOOLEAN NOT NULL DEFAULT false,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  image TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sku TEXT DEFAULT '',
  weight TEXT DEFAULT '',
  weights JSONB DEFAULT '[]'::jsonb,
  weight_variants JSONB DEFAULT '[]'::jsonb,
  strain_type TEXT DEFAULT '',
  potency TEXT DEFAULT '',
  inventory INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category_slug ON public.products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Everyone can view active products
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
CREATE POLICY "Allow public read access to products" ON public.products
  FOR SELECT USING (true);

-- Only Admins can modify products
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE USING (public.is_admin());

-- ============================================================================
-- 4. ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  shipping_address TEXT NOT NULL,
  billing_address TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL DEFAULT 'Dispensary Direct',
  payment_status TEXT NOT NULL DEFAULT 'Awaiting Payment Verification',
  status TEXT NOT NULL DEFAULT 'Received & Stealth Processing',
  tracking_number TEXT DEFAULT '',
  carrier TEXT DEFAULT 'Priority Stealth Express Courier',
  estimated_delivery TEXT DEFAULT '2-3 Business Days',
  coupon_code TEXT DEFAULT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own orders or admins can view all" ON public.orders;
CREATE POLICY "Customers can view own orders or admins can view all" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = customer_email OR public.is_admin());

DROP POLICY IF EXISTS "Allow checkout inserts" ON public.orders;
CREATE POLICY "Allow checkout inserts" ON public.orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.is_admin());

-- ============================================================================
-- 5. CONTACT SUBMISSIONS & PRODUCT ENQUIRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'contact_form',
  product_reference TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anyone to insert contact submissions" ON public.contact_submissions;
CREATE POLICY "Allow anyone to insert contact submissions" ON public.contact_submissions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can view contact submissions" ON public.contact_submissions
  FOR SELECT USING (public.is_admin());

-- ============================================================================
-- 6. NEWSLETTER SUBSCRIBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  coupon_code TEXT NOT NULL DEFAULT 'HERBS15OFF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anyone to subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Allow anyone to subscribe to newsletter" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can view newsletter subscribers" ON public.newsletter_subscribers
  FOR SELECT USING (public.is_admin());

-- ============================================================================
-- 7. PRODUCT REVIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  author TEXT NOT NULL,
  email TEXT DEFAULT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved reviews or admin can view all" ON public.product_reviews;
CREATE POLICY "Public can view approved reviews or admin can view all" ON public.product_reviews
  FOR SELECT USING (status = 'approved' OR public.is_admin());

DROP POLICY IF EXISTS "Public can submit product reviews" ON public.product_reviews;
CREATE POLICY "Public can submit product reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update and delete reviews" ON public.product_reviews;
CREATE POLICY "Admins can update and delete reviews" ON public.product_reviews
  FOR ALL USING (public.is_admin());

-- ============================================================================
-- 8. SUPABASE STORAGE BUCKETS CONFIGURATION
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('product-images', 'product-images', true),
  ('public-assets', 'public-assets', true),
  ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public read for product-images and public-assets
DROP POLICY IF EXISTS "Public read access for product-images" ON storage.objects;
CREATE POLICY "Public read access for product-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public read access for public-assets" ON storage.objects;
CREATE POLICY "Public read access for public-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'public-assets');

-- Storage RLS: Authenticated and admin users can upload product-images
DROP POLICY IF EXISTS "Authenticated users or admins can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users or admins can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('product-images', 'public-assets') AND (auth.role() = 'authenticated' OR public.is_admin()));

-- Storage RLS: Customer documents private to owner
DROP POLICY IF EXISTS "Users can access own documents or admins can view" ON storage.objects;
CREATE POLICY "Users can access own documents or admins can view" ON storage.objects
  FOR ALL USING (
    bucket_id = 'customer-documents' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()
    )
  );
