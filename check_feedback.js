import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sudmwgwwlsdkpoxrnsji.supabase.co';
const supabaseKey = 'sb_publishable_NmAqx6bPjCKyu1BAAjhMVA_v2_JKJS2';

const client = createClient(supabaseUrl, supabaseKey);

async function checkFeedback() {
    console.log('Checking perspective_feedback table...');
    const { data, error } = await client
        .from('perspective_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching feedback:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} feedback entries:`);
        data.forEach((item, index) => {
            console.log(`\n[${index + 1}] Rating: ${item.is_good ? '👍' : '👎'}`);
            console.log(`Text: "${item.text}"`);
            if (item.reason) console.log(`Reason: ${item.reason}`);
            console.log(`Metadata: ${JSON.stringify(item.metadata)}`);
            console.log(`Time: ${item.created_at}`);
        });
    } else {
        console.log('No feedback found in the table.');
    }
}

checkFeedback();
