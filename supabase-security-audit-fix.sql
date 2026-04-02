-- ============================================================
-- Supabase Security Audit Fix (Security Hardening)
-- ============================================================
-- Date: 2026-04-01
-- Goal: Fix "Table publicly accessible" warning and enable RLS
-- ============================================================

-- 1. Enable RLS on all tables to satisfy Supabase security check
ALTER TABLE IF EXISTS user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS redeem_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gateway_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_gateway_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS perspective_feedback ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing overly-permissive policies (Cleaning before hardening)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('user_subscriptions', 'user_membership', 'user_settings', 'user_data', 'redeem_codes', 'gateway_metadata', 'user_gateway_overrides', 'perspective_feedback')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 3. Create SECURE and REASONABLE policies

-- [user_data]: Restricted to the owner
-- Note: If you use Supabase Auth, auth.uid() will match user_id. 
-- If you use custom OAuth without Supabase Auth, this will be strictly DENY until you configure Supabase Auth.
CREATE POLICY "Private access to own data"
  ON user_data
  FOR ALL
  TO authenticated -- Requires a valid Supabase token
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = email);

-- [user_subscriptions]: Read-only for owner (Updates via edge functions)
CREATE POLICY "View own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Only allow insert/update from service-role (edge functions)
-- We don't need a specific policy for service_role as it bypasses RLS.

-- [user_membership]: Restricted to owner
CREATE POLICY "View own membership"
  ON user_membership
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- [user_settings]: Restricted to owner
CREATE POLICY "Manage own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- [redeem_codes]: CRITICAL TABLE - ABSOLUTELY NO PUBLIC READ
-- We only want to check a specific code exists via a remote procedure call (RPC) or restricted select.
-- For standard RLS, we block all access to non-authenticated/non-service users.
-- Note: Service role (used in Edge Functions) ignores these policies.
CREATE POLICY "System only access to redeem codes"
  ON redeem_codes
  FOR ALL
  TO service_role -- Only specific roles can access
  USING (true);

-- [gateway_metadata]: Shared Cache Table
-- This table is safe to be readable by anyone, but NOT writable.
CREATE POLICY "Public read for gateway metadata"
  ON gateway_metadata
  FOR SELECT
  USING (true); -- Publicly viewable site titles/icons

CREATE POLICY "Write access for authenticated users to gateway metadata"
  ON gateway_metadata
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Only logged-in users can contribute to the cache

-- [user_gateway_overrides]: Private overrides
CREATE POLICY "Manage own overrides"
  ON user_gateway_overrides
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- [perspective_feedback]: Contribution table
CREATE POLICY "Allow feedback submission"
  ON perspective_feedback
  FOR INSERT
  WITH CHECK (true); -- Allow anyone to send feedback (even anonymous guests)

CREATE POLICY "View own feedback"
  ON perspective_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- 4. Verify RLS states
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_subscriptions', 'user_membership', 'user_settings', 'user_data', 'redeem_codes', 'gateway_metadata', 'user_gateway_overrides', 'perspective_feedback');
