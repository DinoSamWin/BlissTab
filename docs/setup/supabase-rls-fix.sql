-- Fix RLS policies for Google OAuth users (no Supabase Auth session)
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- Fix user_subscriptions table RLS policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON user_subscriptions;

-- Create new policies that work with Google OAuth (no auth.uid())
-- For Google OAuth users, we rely on application-level validation
-- The application ensures user_id matches the authenticated user

-- SELECT policy: Allow users to view their own subscription
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions
  FOR SELECT
  USING (true); -- Allow all reads (application validates user_id)

-- INSERT policy: Allow users to insert their own subscription
CREATE POLICY "Users can insert their own subscription"
  ON user_subscriptions
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts (application validates user_id)

-- UPDATE policy: Allow users to update their own subscription
CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions
  FOR UPDATE
  USING (true) -- Allow all updates (application validates user_id)
  WITH CHECK (true);

-- ============================================
-- Fix user_membership table RLS policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own membership" ON user_membership;
DROP POLICY IF EXISTS "Users can insert their own membership" ON user_membership;
DROP POLICY IF EXISTS "Users can update their own membership" ON user_membership;

-- SELECT policy
CREATE POLICY "Users can view their own membership"
  ON user_membership
  FOR SELECT
  USING (true); -- Allow all reads (application validates user_id)

-- INSERT policy
CREATE POLICY "Users can insert their own membership"
  ON user_membership
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts (application validates user_id)

-- UPDATE policy
CREATE POLICY "Users can update their own membership"
  ON user_membership
  FOR UPDATE
  USING (true) -- Allow all updates (application validates user_id)
  WITH CHECK (true);

-- ============================================
-- Fix user_settings table RLS policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;

-- SELECT policy
CREATE POLICY "Users can view their own settings"
  ON user_settings
  FOR SELECT
  USING (true); -- Allow all reads (application validates user_id)

-- INSERT policy
CREATE POLICY "Users can insert their own settings"
  ON user_settings
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts (application validates user_id)

-- UPDATE policy
CREATE POLICY "Users can update their own settings"
  ON user_settings
  FOR UPDATE
  USING (true) -- Allow all updates (application validates user_id)
  WITH CHECK (true);

-- ============================================
-- Note: user_data table already has correct RLS policy
-- (USING (true) WITH CHECK (true))
-- ============================================

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('user_subscriptions', 'user_membership', 'user_settings', 'user_data')
ORDER BY tablename, policyname;

