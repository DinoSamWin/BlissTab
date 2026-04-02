-- Create perspective_feedback table for prompt tuning
CREATE TABLE IF NOT EXISTS perspective_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT, -- Can be null for unauthenticated devs
  text TEXT NOT NULL,
  is_good BOOLEAN NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE perspective_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated inserts (Dev tool requirement)
DROP POLICY IF EXISTS "Allow any insert for perspective_feedback" ON perspective_feedback;
CREATE POLICY "Allow any insert for perspective_feedback" 
  ON perspective_feedback 
  FOR INSERT 
  WITH CHECK (true);

-- Allow authenticated users to view all feedback (for dev analysis)
DROP POLICY IF EXISTS "Allow authenticated select for perspective_feedback" ON perspective_feedback;
CREATE POLICY "Allow authenticated select for perspective_feedback"
  ON perspective_feedback
  FOR SELECT
  USING (true);
