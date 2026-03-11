
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
        const eventType = event.eventType || event.type;
        const eventObject = event.object || event.data;

        console.log(`Received webhook event: ${eventType}`);

        // 2. Handle Events
        switch (eventType) {
            case 'payment.success':
            case 'checkout.completed':
            case 'subscription.created':
            case 'subscription.renewed':
            case 'subscription.active':
                await handleSubscriptionUpdate(eventObject);
                break;

            case 'subscription.canceled':
            case 'subscription.expired':
                await handleSubscriptionCancellation(eventObject);
                break;

            default:
                console.log(`Unhandled event type: ${eventType}`);
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
    const customerEmail = data.customer_email || data.customer?.email;
    const productId = data.product_id || (data.product && typeof data.product === 'object' ? data.product.id : data.product);

    if (!customerEmail) return;

    // Find user by email (mapping email to user_id)
    // Preference order: 1. public users profile, 2. user_data (frontend saves sub as user_id there), 3. auth.users UUID
    let userId = null;

    // 1. Check public.users
    const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('email', customerEmail)
        .maybeSingle();

    if (profile?.id) {
        userId = profile.id;
    } else {
        // 2. Check user_data (where frontend saves Google sub)
        const { data: userData } = await supabase
            .from('user_data')
            .select('user_id')
            .eq('email', customerEmail)
            .limit(1)
            .maybeSingle();

        if (userData?.user_id) {
            userId = userData.user_id;
        } else {
            // 3. Fallback to auth.users UUID
            const { data: authUser } = await supabase
                .schema('auth')
                .from('users')
                .select('id')
                .eq('email', customerEmail)
                .maybeSingle();
            if (authUser) userId = authUser.id;
        }
    }

    if (!userId) {
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
            user_id: userId,
            is_subscribed: true,
            subscription_plan: plan,
            subscription_status: 'active',
            subscription_expires_at: data.current_period_end || data.currentPeriodEndDate, // Support both snake and camel
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    if (error) console.error('Failed to update subscription:', error);
}

async function handleSubscriptionCancellation(data: any) {
    const customerEmail = data.customer_email || data.customer?.email;

    if (!customerEmail) {
        console.error('No customer email provided in cancellation event');
        return;
    }

    // Find user by email (mapping email to user_id)
    // Preference order: 1. public users profile, 2. user_data (frontend saves sub as user_id there), 3. auth.users UUID
    let userId = null;

    // 1. Check public.users
    const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('email', customerEmail)
        .maybeSingle();

    if (profile?.id) {
        userId = profile.id;
    } else {
        // 2. Check user_data (where frontend saves Google sub)
        const { data: userData } = await supabase
            .from('user_data')
            .select('user_id')
            .eq('email', customerEmail)
            .limit(1)
            .maybeSingle();

        if (userData?.user_id) {
            userId = userData.user_id;
        } else {
            // 3. Fallback to auth.users UUID
            const { data: authUser } = await supabase
                .schema('auth')
                .from('users')
                .select('id')
                .eq('email', customerEmail)
                .maybeSingle();
            if (authUser) userId = authUser.id;
        }
    }

    if (!userId) {
        console.error(`User not found for cancellation email: ${customerEmail}`);
        return;
    }

    // Logic to set is_subscribed = false or status = 'canceled'
    const { error } = await supabase
        .from('user_subscriptions')
        .update({
            is_subscribed: false,
            subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

    if (error) {
        console.error('Failed to update subscription cancellation:', error);
    } else {
        console.log(`Successfully revoked privileges for user ${userId}`);
    }
}
