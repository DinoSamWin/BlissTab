const url = 'https://api.test.creem.io/v1/transactions/test_tx_123/refund';
const modeKey = process.env.VITE_CREEM_API_KEY_TEST || 'YOUR_TEST_KEY_HERE';

async function test() {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${modeKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}
test();
