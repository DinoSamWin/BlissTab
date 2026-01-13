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
CREATE POLICY "Users can view their own data"
  ON user_data
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = email);

-- Create policy: Users can insert their own data
CREATE POLICY "Users can insert their own data"
  ON user_data
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = email);

-- Create policy: Users can update their own data
CREATE POLICY "Users can update their own data"
  ON user_data
  FOR UPDATE
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = email);

-- Create policy: Users can delete their own data
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
CREATE TRIGGER update_user_data_updated_at
  BEFORE UPDATE ON user_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create user_subscriptions table for subscription management
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  is_subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_plan TEXT NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'team')),
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
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = (SELECT email FROM user_data WHERE user_id = user_subscriptions.user_id));

-- Create policy: Users can update their own subscription (for status checks)
-- Note: Actual subscription updates should be done via webhooks/admin functions
CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions
  FOR UPDATE
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'email' = (SELECT email FROM user_data WHERE user_id = user_subscriptions.user_id));

-- Trigger to update updated_at on subscription row update
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

