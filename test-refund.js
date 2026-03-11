const url = 'https://sudmwgwwlsdkpoxrnsji.supabase.co/functions/v1/creem-checkout';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZG13Z3d3bHNka3BveHJuc2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyODI0MDEsImV4cCI6MjA4Mzg1ODQwMX0.LgJFWmU-ONOmoun-YJRaj0y6xs1vaRBM9nNxXWOTTm0';

async function test() {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
    body: JSON.stringify({ action: 'refund_transaction', transactionId: 'test_tx_123' })
  });
  console.log('Status:', res.status);
  const json = await res.json();
  console.log('Response:', JSON.stringify(json, null, 2));
}
test();
