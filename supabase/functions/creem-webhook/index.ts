
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

            case 'refund.created':
            case 'refund.succeeded':
                await handleRefundEvent(eventObject, eventType);
                break;

            case 'payout.created':
            case 'payout.paid':
                // Optional: track payouts if needed
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

    // Find user
    // Priority 1: Metadata userId (most reliable for cross-email payments)
    let userId = data.metadata?.userId || (data.metadata && typeof data.metadata === 'string' ? JSON.parse(data.metadata).userId : null);

    if (!userId) {
        // Priority 2: public.users
        const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('email', customerEmail)
            .maybeSingle();
        
        if (profile?.id) {
            userId = profile.id;
        } else {
            // Priority 3: user_data (Google sub mapping)
            const { data: userData } = await supabase
                .from('user_data')
                .select('user_id')
                .eq('email', customerEmail)
                .limit(1)
                .maybeSingle();

            if (userData?.user_id) {
                userId = userData.user_id;
            } else {
                // Priority 4: auth.users (Fallback)
                const { data: authUser } = await supabase
                    .schema('auth')
                    .from('users')
                    .select('id')
                    .eq('email', customerEmail)
                    .maybeSingle();
                if (authUser) userId = authUser.id;
            }
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

    // Find user
    // Priority 1: Metadata
    let userId = data.metadata?.userId || (data.metadata && typeof data.metadata === 'string' ? JSON.parse(data.metadata).userId : null);

    if (!userId) {
        const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('email', customerEmail)
            .maybeSingle();
        
        if (profile?.id) {
            userId = profile.id;
        } else {
            const { data: userData } = await supabase
                .from('user_data')
                .select('user_id')
                .eq('email', customerEmail)
                .limit(1)
                .maybeSingle();

            if (userData?.user_id) {
                userId = userData.user_id;
            } else {
                const { data: authUser } = await supabase
                    .schema('auth')
                    .from('users')
                    .select('id')
                    .eq('email', customerEmail)
                    .maybeSingle();
                if (authUser) userId = authUser.id;
            }
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

async function handleRefundEvent(data: any, type: string) {
    const customerEmail = data.customer_email || data.customer?.email;
    const orderId = data.order_id || data.id;
    const amount = data.amount_total || data.amount;
    const currency = data.currency;

    console.log(`Processing refund event: ${type} for ${customerEmail}`);

    // Find User (Robust search)
    let userId = null;
    const { data: profile } = await supabase.from('users').select('id').eq('email', customerEmail).maybeSingle();
    if (profile?.id) {
        userId = profile.id;
    } else {
        const { data: userData } = await supabase.from('user_data').select('user_id').eq('email', customerEmail).limit(1).maybeSingle();
        if (userData?.user_id) {
            userId = userData.user_id;
        } else {
            const { data: authUser } = await supabase.schema('auth').from('users').select('id').eq('email', customerEmail).maybeSingle();
            if (authUser) userId = authUser.id;
        }
    }

    // 1. Record in refund_requests table
    const { error: insertError } = await supabase
        .from('refund_requests')
        .upsert({
            user_id: userId,
            email: customerEmail,
            order_id: orderId.toString(),
            amount_total: amount ? (amount / 100) : 0, // Assume amount is in cents
            currency: currency,
            status: type === 'refund.succeeded' ? 'completed' : 'pending',
            creem_refund_id: data.id?.toString(),
            reason: data.reason || 'Requested via support',
            updated_at: new Date().toISOString(),
        }, { onConflict: 'order_id' });

    if (insertError) console.error('Failed to log refund request:', insertError);

    // 2. If refund is successful, revoke subscription
    if (type === 'refund.succeeded' && userId) {
        await supabase
            .from('user_subscriptions')
            .update({
                is_subscribed: false,
                subscription_status: 'refunded',
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        
        console.log(`Revoking access for refunded user: ${userId}`);
    }

    // 3. Email Notification using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${resendApiKey}`,
                },
                body: JSON.stringify({
                    from: 'StartlyTab Payments <onboarding@resend.dev>', // Resend trial domain
                    to: 'support@startlytab.com',
                    subject: `[Refund Action Required] ${type}: ${customerEmail}`,
                    html: `
                        <h2>Refund Event Detected</h2>
                        <p><strong>Type:</strong> ${type}</p>
                        <p><strong>Customer:</strong> ${customerEmail}</p>
                        <p><strong>Order ID:</strong> ${orderId}</p>
                        <p><strong>Amount:</strong> ${amount ? amount / 100 : 0} ${currency}</p>
                        <p><strong>Reason:</strong> ${data.reason || 'Not specified'}</p>
                        <hr />
                        <p>Status recorded in database as: ${type === 'refund.succeeded' ? 'completed' : 'pending'}</p>
                        <p>Please log in to your Creem/Stripe dashboard to manage this if needed.</p>
                    `,
                }),
            });

            if (res.ok) {
                console.log('Refund notification email sent successfully');
            } else {
                const errorData = await res.json();
                console.error('Failed to send email via Resend:', errorData);
            }
        } catch (emailError) {
            console.error('Error calling Resend API:', emailError);
        }
    } else {
        console.warn('RESEND_API_KEY not found in environment, skipping email.');
    }

    console.log(`NOTIFICATION: Refund ${type} for ${customerEmail} - Amount: ${amount} ${currency}`);
}
