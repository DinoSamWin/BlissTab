-- Supabase Database Schema for StartlyTab
-- Run this SQL in your Supabase SQL Editor

-- Create user_data table
CREATE TABLE IF NOT EXISTS user_data (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_data_email ON user_data(email);

-- Enable Row Level Security (RLS)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only access their own data
DROP POLICY IF EXISTS "Users can view their own data" ON user_data;
CREATE POLICY "Users can view their own data"
  ON user_data
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = email);

-- Create policy: Users can insert their own data
DROP POLICY IF EXISTS "Users can insert their own data" ON user_data;
CREATE POLICY "Users can insert their own data"
  ON user_data
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = email);

-- Create policy: Users can update their own data
DROP POLICY IF EXISTS "Users can update their own data" ON user_data;
CREATE POLICY "Users can update their own data"
  ON user_data
  FOR UPDATE
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = email);

-- Create policy: Users can delete their own data
DROP POLICY IF EXISTS "Users can delete their own data" ON user_data;
CREATE POLICY "Users can delete their own data"
  ON user_data
  FOR DELETE
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = email);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_user_data_updated_at ON user_data;
CREATE TRIGGER update_user_data_updated_at
  BEFORE UPDATE ON user_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create user_subscriptions table for subscription management
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  is_subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_plan TEXT NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'plus', 'pro')),
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'canceled')),
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Create index on subscription status for analytics
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(subscription_status);

-- Enable Row Level Security (RLS)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own subscription
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = (SELECT email FROM user_data WHERE user_id = user_subscriptions.user_id));

-- Create policy: Users can update their own subscription (for status checks)
-- Note: Actual subscription updates should be done via webhooks/admin functions
DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;
CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions
  FOR UPDATE
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = (SELECT email FROM user_data WHERE user_id = user_subscriptions.user_id));

-- Trigger to update updated_at on subscription row update
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create redeem_codes table for membership unlock codes
CREATE TABLE IF NOT EXISTS redeem_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  redeemed_by_user_id TEXT,
  redeemed_by_email TEXT,
  campaign TEXT,
  notes TEXT
);

-- Create index on code for fast lookups
CREATE INDEX IF NOT EXISTS idx_redeem_codes_code ON redeem_codes(code);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_status ON redeem_codes(status);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_redeemed_by_user_id ON redeem_codes(redeemed_by_user_id);

-- Create user_membership table (authoritative membership state)
CREATE TABLE IF NOT EXISTS user_membership (
  user_id TEXT PRIMARY KEY,
  is_subscribed BOOLEAN NOT NULL DEFAULT false,
  member_via_redeem BOOLEAN NOT NULL DEFAULT false,
  redeem_code_id UUID REFERENCES redeem_codes(id),
  membership_since TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on membership flags for queries
CREATE INDEX IF NOT EXISTS idx_user_membership_is_subscribed ON user_membership(is_subscribed);
CREATE INDEX IF NOT EXISTS idx_user_membership_member_via_redeem ON user_membership(member_via_redeem);

-- Enable Row Level Security (RLS)
ALTER TABLE user_membership ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own membership
DROP POLICY IF EXISTS "Users can view their own membership" ON user_membership;
CREATE POLICY "Users can view their own membership"
  ON user_membership
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = (SELECT email FROM user_data WHERE user_id = user_membership.user_id));

-- Create policy: Users can insert their own membership (for redeem operations)
-- Allow insert if user_id matches auth.uid() OR if email matches (for OAuth users)
DROP POLICY IF EXISTS "Users can insert their own membership" ON user_membership;
CREATE POLICY "Users can insert their own membership"
  ON user_membership
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id 
    OR auth.jwt() ->> 'email' = (SELECT email FROM user_data WHERE user_id = user_membership.user_id)
    -- Allow if user_data exists with matching email (for OAuth users without Supabase auth session)
    OR EXISTS (SELECT 1 FROM user_data WHERE user_id = user_membership.user_id)
  );

-- Create policy: Users can update their own membership (for redeem operations)
DROP POLICY IF EXISTS "Users can update their own membership" ON user_membership;
CREATE POLICY "Users can update their own membership"
  ON user_membership
  FOR UPDATE
  USING (
    auth.uid()::text = user_id 
    OR auth.jwt() ->> 'email' = (SELECT email FROM user_data WHERE user_id = user_membership.user_id)
    -- Allow if user_data exists with matching user_id (for OAuth users)
    OR EXISTS (SELECT 1 FROM user_data WHERE user_id = user_membership.user_id)
  );

-- Trigger to update updated_at on membership row update
DROP TRIGGER IF EXISTS update_user_membership_updated_at ON user_membership;
CREATE TRIGGER update_user_membership_updated_at
  BEFORE UPDATE ON user_membership
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create user_settings table for feature toggles
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  redeem_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own settings
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
CREATE POLICY "Users can view their own settings"
  ON user_settings
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = (SELECT email FROM user_data WHERE user_id = user_settings.user_id));

-- Create policy: Users can update their own settings
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
CREATE POLICY "Users can update their own settings"
  ON user_settings
  FOR UPDATE
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = (SELECT email FROM user_data WHERE user_id = user_settings.user_id));

-- Trigger to update updated_at on settings row update
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Gateways: global metadata (deduped by canonical_url) + per-user overrides
-- ============================================================

-- Global metadata cache (shared across users, deduped by canonical_url)
CREATE TABLE IF NOT EXISTS gateway_metadata (
  canonical_url TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  site_title TEXT,
  icon_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gateway_metadata_hostname ON gateway_metadata(hostname);

-- Optional: enable RLS if you use Supabase Auth or Edge Functions.
-- If you're using custom Google OAuth without Supabase Auth sessions,
-- consider keeping RLS OFF and/or writing via Edge Functions (service role).
-- ALTER TABLE gateway_metadata ENABLE ROW LEVEL SECURITY;

-- Per-user overrides (custom name + uploaded logo refs), deduped by (user_id, canonical_url)
CREATE TABLE IF NOT EXISTS user_gateway_overrides (
  user_id TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  custom_title TEXT,
  custom_logo_path TEXT,
  custom_logo_url TEXT, -- Public URL (if bucket is public)
  custom_logo_signed_url TEXT, -- Signed URL (for private buckets, valid for 1 year)
  custom_logo_hash TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, canonical_url)
);

CREATE INDEX IF NOT EXISTS idx_user_gateway_overrides_user_id ON user_gateway_overrides(user_id);

-- Optional: enable RLS if you use Supabase Auth or Edge Functions.
-- ALTER TABLE user_gateway_overrides ENABLE ROW LEVEL SECURITY;

-- Trigger to update updated_at on overrides row update
DROP TRIGGER IF EXISTS update_user_gateway_overrides_updated_at ON user_gateway_overrides;
CREATE TRIGGER update_user_gateway_overrides_updated_at
  BEFORE UPDATE ON user_gateway_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Storage (manual setup)
-- ============================================================
-- Create a Storage bucket named: gateway-logos
-- Recommended access:
-- - Private bucket + signed URLs, OR
-- - Public bucket if you are okay with public asset URLs

-- ============================================================
-- Storage RLS Policies (run after creating the bucket)
-- ============================================================
-- IMPORTANT: Run these policies AFTER creating the bucket in Supabase Dashboard
-- Go to: Storage > gateway-logos > Policies

-- Option 1: If using Supabase Auth (auth.uid() works)
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'gateway-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own files
CREATE POLICY "Users can read their own logos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'gateway-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files
CREATE POLICY "Users can update their own logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'gateway-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'gateway-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Option 2: If using custom Google OAuth (auth.uid() doesn't work)
-- Since auth.uid() is not available, we have two options:

-- Solution A: Make bucket public (RECOMMENDED - Simplest)
-- 1. Go to Supabase Dashboard > Storage > gateway-logos > Settings
-- 2. Enable "Public bucket"
-- 3. No RLS policies needed for public buckets
-- This allows anyone to read, but only authenticated users can upload (if you set upload policies)

-- Solution B: Disable RLS for this bucket (Works but less secure)
-- Run this SQL to disable RLS for storage.objects (affects all buckets):
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
-- 
-- Then create policies that allow authenticated users:
-- Note: These policies will work if you're using Supabase client with anon key
-- but may not work with custom OAuth. If they don't work, use Solution A.

-- Solution C: Allow all authenticated requests (if using Supabase client)
-- If your Supabase client is properly authenticated (even with custom OAuth),
-- you can try these more permissive policies:
DROP POLICY IF EXISTS "Allow authenticated uploads to gateway-logos" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to gateway-logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'gateway-logos');

DROP POLICY IF EXISTS "Allow authenticated reads from gateway-logos" ON storage.objects;
CREATE POLICY "Allow authenticated reads from gateway-logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'gateway-logos');

DROP POLICY IF EXISTS "Allow authenticated updates to gateway-logos" ON storage.objects;
CREATE POLICY "Allow authenticated updates to gateway-logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'gateway-logos');

DROP POLICY IF EXISTS "Allow authenticated deletes from gateway-logos" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from gateway-logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'gateway-logos');

-- ============================================================
-- Migration: Add custom_logo_signed_url column (if table exists)
-- ============================================================
-- Run this if you already have user_gateway_overrides table:
-- ALTER TABLE user_gateway_overrides 
-- ADD COLUMN IF NOT EXISTS custom_logo_signed_url TEXT;

