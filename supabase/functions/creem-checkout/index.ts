import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createCreem } from 'npm:creem_io@latest'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VERSION = "1.1.2";

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const bodyText = await req.text();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const { email, action } = body;
        const normalizedAction = (action || '').toString().toLowerCase().replace(/-/g, '_');

        const apiKeyLive = Deno.env.get('CREEM_API_KEY') || "";
        const apiKeyTest = Deno.env.get('CREEM_API_KEY_TEST') || "";

        if (normalizedAction === 'create_checkout') {
            const { productId, testMode } = body;
            const key = testMode ? apiKeyTest : apiKeyLive;
            if (!key) return new Response(JSON.stringify({ success: false, error: "API Key not configured", version: VERSION }), { status: 200, headers: corsHeaders });

            try {
                console.log(`[Checkout] Creating session for product: ${productId}, testMode: ${testMode}`);
                const creem = createCreem({ apiKey: key, testMode: !!testMode });
                const session = await creem.checkouts.create({
                    productId: productId,
                    customerEmail: email,
                    successUrl: `${req.headers.get('origin') || 'http://localhost:3000'}/subscription?payment=success`,
                    cancelUrl: `${req.headers.get('origin') || 'http://localhost:3000'}/subscription?payment=canceled`
                });

                console.log(`[Checkout] Creem Session Response:`, JSON.stringify(session));

                return new Response(JSON.stringify({
                    success: true,
                    checkout_url: (session as any).checkoutUrl || session.checkout_url || (session as any).url,
                    session_id: session.id,
                    session: session, // Full object for debugging
                    version: VERSION
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            } catch (e: any) {
                console.error(`[Checkout] Creem API Error for product ${productId}:`, e.message || e);
                return new Response(JSON.stringify({
                    success: false,
                    error: `Creem API Error: ${e.message || 'Unknown'} (Product: ${productId})`,
                    version: VERSION
                }), { status: 200, headers: corsHeaders });
            }
        }

        if (normalizedAction === 'create_portal') {
            const { testMode } = body;
            const key = testMode ? apiKeyTest : apiKeyLive;
            if (!key) return new Response(JSON.stringify({ error: "API Key not configured", version: VERSION }), { status: 500, headers: corsHeaders });

            try {
                const creem = createCreem({ apiKey: key, testMode: !!testMode });
                const portal = await creem.customers.getPortalUrl({ email });

                return new Response(JSON.stringify({
                    portal_url: (portal as any).portalUrl || portal.portal_url,
                    version: VERSION
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            } catch (e: any) {
                return new Response(JSON.stringify({ error: e.message, version: VERSION }), { status: 400, headers: corsHeaders });
            }
        }

        if (['get_history', 'check_history', 'get_transactions', 'history'].includes(normalizedAction)) {
            const targetEmail = (email || '').toLowerCase().trim();
            const allTransactions: any[] = [];
            const debugInfo: any = {};

            const modes = [
                { key: apiKeyTest, isTest: true, name: 'Test' },
                { key: apiKeyLive, isTest: false, name: 'Live' }
            ];

            for (const mode of modes) {
                if (!mode.key) continue;

                try {
                    const creem = createCreem({ apiKey: mode.key, testMode: mode.isTest });

                    // 1. Get Customer by email explicitly
                    let customer;
                    try {
                        customer = await creem.customers.get({ email: targetEmail });
                    } catch (e: any) {
                        debugInfo[mode.name] = `Customer lookup info: ${e?.message || 'Not found'}`;
                        continue; // No customer found in this mode, skip transactions
                    }

                    if (customer && customer.id) {
                        debugInfo[mode.name] = `CONNECTED. Found customer: ${customer.id}`;
                        // 2. Fetch Transactions for the found customer correctly
                        const [tData, sData] = await Promise.all([
                            creem.transactions.list({ customerId: customer.id, limit: 100 }),
                            creem.subscriptions.list({ customerId: customer.id, limit: 100 })
                        ]);

                        const transactions = tData.items || [];
                        const subscriptions = sData.items || [];

                        transactions.forEach((t: any) => {
                            if (!allTransactions.find(it => it.id === t.id)) {
                                // Find associated subscription to get its current status
                                const subId = t.subscription_id || (typeof t.subscription === 'string' ? t.subscription : t.subscription?.id);
                                const sub = subscriptions.find((s: any) => s.id === subId);

                                allTransactions.push({
                                    ...t,
                                    source: mode.name,
                                    subscription_status: sub ? sub.status : null
                                });
                            }
                        });
                    }
                } catch (e: any) {
                    debugInfo[mode.name] = `ERROR: ${e?.message || 'unknown'}`;
                }
            }

            return new Response(JSON.stringify({
                transactions: allTransactions,
                version: VERSION,
                debug: debugInfo,
                emailTried: targetEmail
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        if (normalizedAction === 'cancel_subscription') {
            const { subscriptionId } = body;
            if (!subscriptionId) {
                return new Response(JSON.stringify({ error: "Missing subscriptionId", version: VERSION }), { status: 400, headers: corsHeaders });
            }

            const modes = [
                { key: apiKeyTest, isTest: true, name: 'Test' },
                { key: apiKeyLive, isTest: false, name: 'Live' }
            ];

            const supabaseUrl = Deno.env.get('SUPABASE_URL') || "";
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || "";
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            let success = false;
            let lastError = "Unable to cancel";

            for (const mode of modes) {
                if (!mode.key) continue;
                try {
                    const creem = createCreem({ apiKey: mode.key, testMode: mode.isTest });
                    // Use immediate mode to ensure it reflects in DB and UI right away as requested
                    await creem.subscriptions.cancel({ subscriptionId, mode: 'immediate' });

                    // Direct database update for immediate feedback
                    try {
                        const sub = await creem.subscriptions.get({ subscriptionId });
                        const email = sub.customer_email || (sub.customer && typeof sub.customer === 'object' ? sub.customer.email : '');
                        if (email) {
                            let userId = null;
                            const { data: profile } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
                            if (profile?.id) {
                                userId = profile.id;
                            } else {
                                const { data: userData } = await supabase.from('user_data').select('user_id').eq('email', email).limit(1).maybeSingle();
                                if (userData?.user_id) {
                                    userId = userData.user_id;
                                } else {
                                    const { data: authUser } = await supabase.schema('auth').from('users').select('id').eq('email', email).maybeSingle();
                                    if (authUser) userId = authUser.id;
                                }
                            }

                            if (userId) {
                                await supabase.from('user_subscriptions').update({
                                    is_subscribed: false,
                                    subscription_status: 'canceled',
                                    updated_at: new Date().toISOString(),
                                }).eq('user_id', userId);
                            }
                        }
                    } catch (dbErr) {
                        console.log('[Cancel] Immediate DB update failed:', dbErr.message);
                    }

                    success = true;
                    break;
                } catch (e: any) {
                    lastError = e?.message || 'unknown';
                }
            }

            return new Response(JSON.stringify({
                success,
                error: success ? null : lastError,
                version: VERSION
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: success ? 200 : 400,
            });
        }

        if (normalizedAction === 'refund_transaction') {
            const { transactionId, subscriptionId } = body;
            if (!transactionId) {
                return new Response(JSON.stringify({ error: "Missing transactionId", version: VERSION }), { status: 400, headers: corsHeaders });
            }

            const modes = [
                { key: apiKeyTest, isTest: true, name: 'Test' },
                { key: apiKeyLive, isTest: false, name: 'Live' }
            ];

            const supabaseUrl = Deno.env.get('SUPABASE_URL') || "";
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || "";
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            let success = false;
            let lastError = "Unable to process refund or cancel subscription";

            for (const mode of modes) {
                if (!mode.key) continue;
                try {
                    const creem = createCreem({ apiKey: mode.key, testMode: mode.isTest });
                    console.log(`[Refund] Attempting cancel in ${mode.name} mode...`);

                    if (subscriptionId) {
                        try {
                            // 1. Tell Creem to stop the sub immediately
                            await creem.subscriptions.cancel({ subscriptionId, mode: 'immediate' });
                            console.log(`[Refund] Sub ${subscriptionId} canceled successfully in ${mode.name}`);

                            // 2. Revoke database access immediately
                            try {
                                const sub = await creem.subscriptions.get({ subscriptionId });
                                const email = sub.customer_email || (sub.customer && typeof sub.customer === 'object' ? sub.customer.email : '');

                                if (email) {
                                    // Map email to User ID
                                    // Preference order: 1. public users profile, 2. user_data (Google sub), 3. auth.users UUID
                                    let userId = null;

                                    // 1. Check public.users
                                    const { data: profile } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
                                    if (profile?.id) {
                                        userId = profile.id;
                                    } else {
                                        // 2. Check user_data (where frontend saves Google sub)
                                        const { data: userData } = await supabase.from('user_data').select('user_id').eq('email', email).limit(1).maybeSingle();
                                        if (userData?.user_id) {
                                            userId = userData.user_id;
                                        } else {
                                            // 3. Fallback to auth.users UUID (requires service_role)
                                            const { data: authUser } = await supabase.schema('auth').from('users').select('id').eq('email', email).maybeSingle();
                                            if (authUser) userId = authUser.id;
                                        }
                                    }

                                    if (userId) {
                                        await supabase.from('user_subscriptions').update({
                                            is_subscribed: false,
                                            subscription_status: 'canceled',
                                            updated_at: new Date().toISOString(),
                                        }).eq('user_id', userId);
                                        console.log(`[Refund] Database updated for user ${userId} (${email})`);
                                    }
                                }
                            } catch (dbErr) {
                                console.log('[Refund] Immediate DB update failed (skipping, will rely on webhook):', dbErr.message);
                            }

                            success = true;
                        } catch (subCancelError: any) {
                            console.log(`[Refund] Cancel sub failed in mode ${mode.name}:`, subCancelError.message || subCancelError);
                            lastError = subCancelError.message || subCancelError;
                            success = false;
                        }
                    } else {
                        // For one-time purchases without subscriptions, we just mark it as "success" for the UI.
                        // Since there is no subId, we cannot "cancel" anything. Refund is manual anyway.
                        success = true;
                    }

                    if (success) break;
                } catch (e: any) {
                    lastError = e?.message || 'unknown';
                }
            }

            return new Response(JSON.stringify({
                success,
                error: success ? null : lastError,
                version: VERSION
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: success ? 200 : 400,
            });
        }

        return new Response(JSON.stringify({ error: "Unsupported", version: VERSION }), { status: 400, headers: corsHeaders });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message, version: VERSION }), { headers: corsHeaders, status: 400 });
    }
})
