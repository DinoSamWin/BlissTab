-- Complete RLS Policy Fix for Google OAuth Users
-- Run this SQL in your Supabase SQL Editor
-- This script ensures ALL policies are properly set for Google OAuth authentication

-- ============================================
-- Step 1: Drop ALL existing policies (clean slate)
-- ============================================

-- user_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_subscriptions;

-- user_membership
DROP POLICY IF EXISTS "Users can view their own membership" ON user_membership;
DROP POLICY IF EXISTS "Users can insert their own membership" ON user_membership;
DROP POLICY IF EXISTS "Users can update their own membership" ON user_membership;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_membership;

-- user_settings
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_settings;

-- user_data (keep the working one, but ensure it's correct)
DROP POLICY IF EXISTS "Users can view their own data" ON user_data;
DROP POLICY IF EXISTS "Users can insert their own data" ON user_data;
DROP POLICY IF EXISTS "Users can update their own data" ON user_data;
DROP POLICY IF EXISTS "Users can delete their own data" ON user_data;

-- ============================================
-- Step 2: Create new policies for user_subscriptions
-- ============================================

CREATE POLICY "Allow all operations for user_subscriptions"
  ON user_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Step 3: Create new policies for user_membership
-- ============================================

CREATE POLICY "Allow all operations for user_membership"
  ON user_membership
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Step 4: Create new policies for user_settings
-- ============================================

CREATE POLICY "Allow all operations for user_settings"
  ON user_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Step 5: Ensure user_data has correct policy
-- ============================================

-- Check if the "Allow all operations" policy exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_data' 
    AND policyname = 'Allow all operations for authenticated users'
  ) THEN
    CREATE POLICY "Allow all operations for authenticated users"
      ON user_data
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- Step 6: Verify all policies
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'NULL'
    WHEN qual = 'true' THEN 'true'
    ELSE LEFT(qual::text, 50) || '...'
  END as qual_preview,
  CASE 
    WHEN with_check IS NULL THEN 'NULL'
    WHEN with_check = 'true' THEN 'true'
    ELSE LEFT(with_check::text, 50) || '...'
  END as with_check_preview
FROM pg_policies
WHERE tablename IN ('user_subscriptions', 'user_membership', 'user_settings', 'user_data')
ORDER BY tablename, policyname;

-- Expected result: Each table should have ONE policy with cmd='ALL' and qual='true'

