/**
 * Generate 1000 redeem codes for StartlyTab
 * Format: ST-XXXX-XXXX-XXXX
 * 
 * Usage:
 *   node scripts/generate-redeem-codes.js
 * 
 * Output: SQL INSERT statements to run in Supabase SQL Editor
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed characters (excluding ambiguous: 0, 1, I, O)
const ALLOWED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  const segments = [];
  
  // Generate 3 segments of 4 characters each
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      const randomIndex = Math.floor(Math.random() * ALLOWED_CHARS.length);
      segment += ALLOWED_CHARS[randomIndex];
    }
    segments.push(segment);
  }
  
  return `ST-${segments.join('-')}`;
}

function generateUniqueCodes(count) {
  const codes = new Set();
  const maxAttempts = count * 10; // Safety limit
  let attempts = 0;
  
  while (codes.size < count && attempts < maxAttempts) {
    const code = generateCode();
    codes.add(code);
    attempts++;
  }
  
  if (codes.size < count) {
    throw new Error(`Failed to generate ${count} unique codes after ${attempts} attempts`);
  }
  
  return Array.from(codes);
}

function generateSQL(codes, campaign = null) {
  const timestamp = new Date().toISOString();
  const campaignName = campaign || `batch_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_1000`;
  
  const values = codes.map((code, index) => {
    const id = `gen_random_uuid()`;
    return `(${id}, '${code}', 'enabled', '${timestamp}', NULL, NULL, NULL, NULL, '${campaignName}', NULL)`;
  }).join(',\n    ');
  
  return `-- Generated ${codes.length} redeem codes
-- Campaign: ${campaignName}
-- Generated at: ${timestamp}

INSERT INTO redeem_codes (id, code, status, created_at, expires_at, redeemed_at, redeemed_by_user_id, redeemed_by_email, campaign, notes)
VALUES
    ${values}
ON CONFLICT (code) DO NOTHING;

-- Verify count
SELECT COUNT(*) as total_codes, 
       COUNT(*) FILTER (WHERE status = 'enabled') as enabled_codes,
       COUNT(*) FILTER (WHERE redeemed_at IS NOT NULL) as redeemed_codes
FROM redeem_codes
WHERE campaign = '${campaignName}';`;
}

// Main execution
const COUNT = 1000;
const CAMPAIGN = process.argv[2] || null; // Optional campaign name from command line

try {
  console.log(`Generating ${COUNT} unique redeem codes...`);
  const codes = generateUniqueCodes(COUNT);
  console.log(`✓ Generated ${codes.length} unique codes`);
  
  const sql = generateSQL(codes, CAMPAIGN);
  
  // Output to file
  const outputPath = path.join(__dirname, 'redeem-codes.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');
  
  console.log(`✓ SQL written to: ${outputPath}`);
  console.log(`\nSample codes (first 5):`);
  codes.slice(0, 5).forEach(code => console.log(`  ${code}`));
  console.log(`\nTo use:`);
  console.log(`  1. Open Supabase SQL Editor`);
  console.log(`  2. Copy and paste the contents of ${outputPath}`);
  console.log(`  3. Run the SQL`);
  
} catch (error) {
  console.error('Error generating codes:', error);
  process.exit(1);
}

