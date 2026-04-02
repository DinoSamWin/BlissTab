-- Final RLS Policy Fix - Ensure all policies are correct
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- Step 1: Verify tables exist and RLS is enabled
-- ============================================

-- Check if tables exist
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_subscriptions', 'user_membership', 'user_settings', 'user_data')
ORDER BY tablename;

-- ============================================
-- Step 2: Drop ALL existing policies (complete cleanup)
-- ============================================

-- Get all policy names first (for reference)
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_subscriptions', 'user_membership', 'user_settings', 'user_data')
ORDER BY tablename, policyname;

-- Drop all policies for user_subscriptions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_subscriptions') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_subscriptions', r.policyname);
  END LOOP;
END $$;

-- Drop all policies for user_membership
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_membership') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_membership', r.policyname);
  END LOOP;
END $$;

-- Drop all policies for user_settings
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_settings') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_settings', r.policyname);
  END LOOP;
END $$;

-- Drop all policies for user_data (except the working one)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_data' AND policyname != 'Allow all operations for authenticated users') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_data', r.policyname);
  END LOOP;
END $$;

-- ============================================
-- Step 3: Ensure RLS is enabled
-- ============================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 4: Create single policy for each table
-- ============================================

-- user_subscriptions: Single policy for all operations
CREATE POLICY "Allow all operations for user_subscriptions"
  ON user_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- user_membership: Single policy for all operations
CREATE POLICY "Allow all operations for user_membership"
  ON user_membership
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- user_settings: Single policy for all operations
CREATE POLICY "Allow all operations for user_settings"
  ON user_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- user_data: Ensure it has the correct policy
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
-- Step 5: Final verification
-- ============================================

SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE tablename IN ('user_subscriptions', 'user_membership', 'user_settings', 'user_data')
GROUP BY tablename
ORDER BY tablename;

-- Expected: Each table should have exactly 1 policy

-- Detailed view
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'NULL'
    WHEN qual::text = 'true' THEN 'true ✓'
    ELSE LEFT(qual::text, 30) || '...'
  END as qual,
  CASE 
    WHEN with_check IS NULL THEN 'NULL'
    WHEN with_check::text = 'true' THEN 'true ✓'
    ELSE LEFT(with_check::text, 30) || '...'
  END as with_check
FROM pg_policies
WHERE tablename IN ('user_subscriptions', 'user_membership', 'user_settings', 'user_data')
ORDER BY tablename, policyname;

-- Expected: All policies should have cmd='ALL', qual='true ✓', with_check='true ✓'

