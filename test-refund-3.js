const { createCreem } = require('creem_io');

async function run() {
  const creem = createCreem({
    apiKey: process.env.VITE_CREEM_API_KEY_TEST || 'YOUR_TEST_KEY_HERE',
    testMode: true
  });
  
  try {
     console.log('Attempting to cancel sub_1m2XvA...');
     await creem.subscriptions.cancel({ subscriptionId: 'sub_1m2XvA', mode: 'immediate' });
     console.log('Success!');
  } catch(e) {
     console.log('Failed:', e.message);
  }
}
run();
