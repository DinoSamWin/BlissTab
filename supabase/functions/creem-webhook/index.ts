
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Configuration ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CREEM_SIGNING_SECRET = Deno.env.get('CREEM_SIGNING_SECRET') || '';

// Product IDs (re-use from creem-checkout config or assume global)
const CREEM_PRODUCT_ID_PRO_MONTHLY = Deno.env.get('CREEM_PRODUCT_ID_PRO_MONTHLY') || '';
const CREEM_PRODUCT_ID_PRO_YEARLY = Deno.env.get('CREEM_PRODUCT_ID_PRO_YEARLY') || '';
const CREEM_PRODUCT_ID_LIFETIME = Deno.env.get('CREEM_PRODUCT_ID_LIFETIME') || '';
const CREEM_PRODUCT_ID_PRO_MONTHLY_TEST = Deno.env.get('CREEM_PRODUCT_ID_PRO_MONTHLY_TEST') || '';
const CREEM_PRODUCT_ID_PRO_YEARLY_TEST = Deno.env.get('CREEM_PRODUCT_ID_PRO_YEARLY_TEST') || '';
const CREEM_PRODUCT_ID_LIFETIME_TEST = Deno.env.get('CREEM_PRODUCT_ID_LIFETIME_TEST') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
    try {
        // 1. Verify Webhook Signature (Crucial for security)
        const signature = req.headers.get('x-creem-signature');
        const bodyText = await req.text();

        // TODO: Implement actual signature verification logic provided by Creem
        // if (!verifySignature(bodyText, signature, CREEM_SIGNING_SECRET)) {
        //   return new Response('Invalid signature', { status: 401 });
        // }

        const event = JSON.parse(bodyText);
        console.log(`Received webhook event: ${event.type}`);

        // 2. Handle Events
        switch (event.type) {
            case 'payment.success':
            case 'subscription.created':
            case 'subscription.renewed':
                await handleSubscriptionUpdate(event.data);
                break;

            case 'subscription.canceled':
            case 'subscription.expired':
                await handleSubscriptionCancellation(event.data);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Webhook processing failed:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})

async function handleSubscriptionUpdate(data: any) {
    const customerEmail = data.customer_email;
    const productId = data.product_id;

    if (!customerEmail) return;

    // Find user by email
    // Note: Better to store 'creem_customer_id' on user table and lookup by that
    const { data: user, error: userError } = await supabase
        .from('auth.users') // Note: accessing auth.users directly needs careful permissions or use a public profile table
        .select('id')
        .eq('email', customerEmail)
        .single();

    // If you can't access auth.users, rely on your public 'users' table
    // const { data: user } = await supabase.from('users').select('id').eq('email', customerEmail).single();

    if (!user) {
        console.error(`User not found for email: ${customerEmail}`);
        return;
    }

    // Determine plan based on productId matches (check both Live and Test IDs)
    let plan = 'free';
    if (
        productId === CREEM_PRODUCT_ID_PRO_MONTHLY ||
        productId === CREEM_PRODUCT_ID_PRO_YEARLY ||
        productId === CREEM_PRODUCT_ID_PRO_MONTHLY_TEST ||
        productId === CREEM_PRODUCT_ID_PRO_YEARLY_TEST
    ) {
        plan = 'pro';
    }
    if (
        productId === CREEM_PRODUCT_ID_LIFETIME ||
        productId === CREEM_PRODUCT_ID_LIFETIME_TEST
    ) {
        plan = 'lifetime';
    }

    // Update Subscription Table
    const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
            user_id: user.id,
            is_subscribed: true,
            subscription_plan: plan,
            subscription_status: 'active',
            subscription_expires_at: data.current_period_end, // Convert timestamp if needed
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    if (error) console.error('Failed to update subscription:', error);
}

async function handleSubscriptionCancellation(data: any) {
    // Logic to set is_subscribed = false or status = 'canceled'
}
