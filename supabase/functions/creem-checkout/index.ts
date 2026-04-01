import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createCreem } from 'npm:creem_io@latest'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VERSION = "1.1.6";

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const bodyText = await req.text();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const { email, action } = body;
        const normalizedAction = (action || '').toString().toLowerCase().replace(/-/g, '_');
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || "";
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || "";
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const apiKeyLive = Deno.env.get('CREEM_API_KEY') || "";
        const apiKeyTest = Deno.env.get('CREEM_API_KEY_TEST') || "";

        if (normalizedAction === 'create_checkout') {
            const { productId, testMode, userId } = body;
            const key = testMode ? apiKeyTest : apiKeyLive;
            if (!key) return new Response(JSON.stringify({ success: false, error: "API Key not configured", version: VERSION }), { status: 200, headers: corsHeaders });

            try {
                const creem = createCreem({ apiKey: key, testMode: !!testMode });
                const session = await creem.checkouts.create({
                    productId: productId,
                    customerEmail: email,
                    successUrl: `${req.headers.get('origin') || 'http://localhost:3000'}/subscription?payment=success`,
                    cancelUrl: `${req.headers.get('origin') || 'http://localhost:3000'}/subscription?payment=canceled`,
                    metadata: { userId: userId }
                } as any);

                return new Response(JSON.stringify({
                    success: true,
                    checkout_url: (session as any).checkoutUrl || session.checkout_url || (session as any).url,
                    session_id: session.id,
                    version: VERSION
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            } catch (e: any) {
                return new Response(JSON.stringify({ success: false, error: e.message, version: VERSION }), { status: 200, headers: corsHeaders });
            }
        }

        if (normalizedAction === 'create_portal') {
            const { testMode } = body;
            const key = testMode ? apiKeyTest : apiKeyLive;
            try {
                const creem = createCreem({ apiKey: key, testMode: !!testMode });
                const portal = await creem.customers.getPortalUrl({ email });
                return new Response(JSON.stringify({ portal_url: (portal as any).portalUrl || portal.portal_url, version: VERSION }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            } catch (e: any) {
                return new Response(JSON.stringify({ error: e.message, version: VERSION }), { status: 400, headers: corsHeaders });
            }
        }

        if (normalizedAction === 'ping') {
            return new Response(JSON.stringify({ success: true, message: "pong", version: VERSION }), { status: 200, headers: corsHeaders });
        }

        if (['get_history', 'check_history', 'get_transactions', 'history'].includes(normalizedAction)) {
            const targetEmail = (email || '').toLowerCase().trim();
            const allTransactions: any[] = [];
            const debugInfo: any = { version: VERSION, email: targetEmail };
            
            const modes = [
                { key: apiKeyTest, isTest: true, name: 'Test' },
                { key: apiKeyLive, isTest: false, name: 'Live' }
            ].filter(m => !!m.key);

            for (const mode of modes) {
                try {
                    const creem = createCreem({ apiKey: mode.key, testMode: mode.isTest });
                    const customersToProcess: any[] = [];
                    
                    try {
                        const cList = await creem.customers.list({ email: targetEmail, limit: 10 });
                        const items = (cList as any).items || (Array.isArray(cList) ? cList : []);
                        items.forEach((c: any) => { 
                            // STRICT FILTER: Match the customer email exactly
                            const cEmail = (c.email || c.customer_email || '').toLowerCase().trim();
                            if (c?.id && (cEmail === targetEmail || !targetEmail)) {
                                customersToProcess.push(c); 
                            }
                        });
                        debugInfo[`${mode.name}_customers`] = items.length;
                        debugInfo[`${mode.name}_processed`] = customersToProcess.length;
                    } catch (e: any) {
                        debugInfo[`${mode.name}_customer_err`] = e.message;
                    }

                    for (const customer of customersToProcess) {
                        try {
                            const txData = await creem.transactions.list({ customerId: customer.id, limit: 100 });
                            const txs = (txData as any).items || (Array.isArray(txData) ? txData : []);

                            for (const t of txs) {
                                if (allTransactions.find(it => it.id === t.id)) continue;
                                
                                // One more safety: Verify the transaction email if it exists
                                const txEmail = (t.customer_email || t.email || '').toLowerCase().trim();
                                if (targetEmail && txEmail && txEmail !== targetEmail) {
                                    continue;
                                }
                                
                                // Determine subscription status using single-get (safer than list)
                                let subscriptionStatus = 'unknown';
                                const subId = t.subscription_id || (typeof t.subscription === 'string' ? t.subscription : t.subscription?.id);
                                if (subId) {
                                    try {
                                        const sub = await creem.subscriptions.get({ subscriptionId: subId });
                                        subscriptionStatus = sub.status || 'unknown';
                                    } catch (e) {
                                        // Sub not found – use transaction status as fallback
                                        subscriptionStatus = (t.status === 'paid') ? 'active' : 'unknown';
                                    }
                                }

                                let status = t.status || 'unknown';
                                if (t.refundedAmount && t.refundedAmount > 0) status = 'refunded';

                                allTransactions.push({ ...t, status, source: mode.name, subscription_status: subscriptionStatus });
                            }
                        } catch (e: any) {
                            debugInfo[`${mode.name}_tx_err_${customer.id}`] = e.message;
                        }
                    }
                } catch (e: any) {
                    debugInfo[`${mode.name}_err`] = e.message;
                }
            }

            // Merge with refund_requests to bridge status lag
            if (allTransactions.length > 0) {
                try {
                    const idsToSearch = [...new Set(
                        allTransactions.flatMap(t => {
                            const subId = t.subscription_id || (typeof t.subscription === 'string' ? t.subscription : t.subscription?.id);
                            return [t.id, subId].filter(Boolean);
                        })
                    )];

                    const { data: internalRefunds, error: refundFetchErr } = await supabase
                        .from('refund_requests')
                        .select('order_id, status')
                        .in('order_id', idsToSearch);
                    
                    debugInfo['refund_records_found'] = internalRefunds?.length || 0;
                    if (refundFetchErr) debugInfo['refund_fetch_error'] = refundFetchErr.message;

                    if (internalRefunds && internalRefunds.length > 0) {
                        allTransactions.forEach(t => {
                            const subId = t.subscription_id || (typeof t.subscription === 'string' ? t.subscription : t.subscription?.id);
                            const refund = internalRefunds.find(r => r.order_id === t.id || r.order_id === subId);
                            if (refund && t.status !== 'refunded') {
                                t.status = refund.status === 'completed' ? 'refunded' : 'pending_refund';
                                t.internal_refund_sync = true;
                            }
                        });
                    }
                } catch (dbErr: any) {
                    debugInfo['refund_bridge_error'] = dbErr.message;
                }
            }

            allTransactions.sort((a, b) => {
                const aTime = a.createdAt || new Date(a.created_at || 0).getTime();
                const bTime = b.createdAt || new Date(b.created_at || 0).getTime();
                return bTime - aTime;
            });
            
            return new Response(JSON.stringify({
                transactions: allTransactions,
                version: VERSION,
                debug: debugInfo
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        if (normalizedAction === 'refund_transaction') {
            const { transactionId, subscriptionId } = body;
            if (!transactionId) {
                return new Response(JSON.stringify({ error: "Missing transactionId", version: VERSION }), { status: 400, headers: corsHeaders });
            }

            const modes = [
                { key: apiKeyTest, isTest: true, name: 'Test' },
                { key: apiKeyLive, isTest: false, name: 'Live' }
            ].filter(m => !!m.key);
            
            let success = false;
            let lastError = "Refund failed";

            for (const mode of modes) {
                try {
                    const creem = createCreem({ apiKey: mode.key, testMode: mode.isTest });
                    let customerEmail = '';
                    let userIdFromMetadata: string | null = null;

                    // Get customer details and cancel subscription
                    if (subscriptionId) {
                        let sub: any;
                        try {
                            sub = await creem.subscriptions.get({ subscriptionId });
                        } catch (e: any) {
                            console.log(`[Refund] No sub found in ${mode.name}: ${e.message}`);
                            continue; // Try next mode
                        }
                        customerEmail = (sub as any).customer_email || (sub.customer as any)?.email || '';
                        userIdFromMetadata = ((sub as any).metadata?.userId) || null;
                        
                        await creem.subscriptions.cancel({ subscriptionId, mode: 'immediate' });
                        console.log(`[Refund] Sub ${subscriptionId} canceled in ${mode.name}. Email: ${customerEmail}, metaId: ${userIdFromMetadata}`);
                    }

                    // Resolve user ID: prefer metadata, then auth lookup
                    let finalUserId: string | null = userIdFromMetadata;
                    if (!finalUserId) {
                        // Look up via supabase auth admin
                        try {
                            const { data: userList } = await supabase.auth.admin.listUsers();
                            const lookupEmail = customerEmail || (email || '').toLowerCase();
                            const found = userList?.users?.find((u: any) => u.email?.toLowerCase() === lookupEmail);
                            finalUserId = found?.id || null;
                            console.log(`[Refund] Auth lookup for ${lookupEmail}: found=${finalUserId}`);
                        } catch (authErr: any) {
                            console.error(`[Refund] Auth admin lookup failed: ${authErr.message}`);
                        }
                    }

                    // Update user_subscriptions  
                    if (finalUserId) {
                        const { error: upErr } = await supabase.from('user_subscriptions').update({
                            is_subscribed: false,
                            subscription_status: 'canceled',
                            subscription_plan: 'free',
                            updated_at: new Date().toISOString()
                        }).eq('user_id', finalUserId);
                        if (upErr) console.error(`[Refund] Sub update error: ${upErr.message}`);
                        else console.log(`[Refund] user_subscriptions updated for user ${finalUserId}`);
                    }

                    // Log to refund_requests - pass user_id only if we verified it exists
                    const orderId = transactionId || subscriptionId;
                    const refundRow: any = {
                        email: customerEmail || email || 'unknown',
                        order_id: orderId,
                        amount_total: 0,
                        status: 'pending',
                        reason: 'User requested refund via UI',
                        updated_at: new Date().toISOString()
                    };
                    // Only include user_id if we have a verified one (to avoid FK violations)
                    if (finalUserId) refundRow.user_id = finalUserId;

                    const { data: logData, error: logErr } = await supabase
                        .from('refund_requests')
                        .upsert(refundRow, { onConflict: 'order_id' })
                        .select();
                    
                    if (logErr) {
                        console.error(`[Refund] refund_requests insert FAILED: code=${logErr.code} msg=${logErr.message}`);
                    } else {
                        console.log(`[Refund] refund_requests logged OK for ${orderId}: ${JSON.stringify(logData)}`);
                    }

                    // Notify Admin
                    const resendKey = Deno.env.get('RESEND_API_KEY');
                    if (resendKey) {
                        await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
                            body: JSON.stringify({
                                from: 'Payments <onboarding@resend.dev>',
                                to: 'support@startlytab.com',
                                subject: `Refund Requested: ${customerEmail || finalUserId}`,
                                html: `<p>User ${finalUserId} (${customerEmail}) requested a refund for order <strong>${orderId}</strong>. Access revoked.</p>`
                            })
                        }).catch(() => {});
                    }

                    success = true;
                    break;
                } catch (e: any) {
                    lastError = e.message;
                    console.error(`[Refund] Mode ${mode.name} failed: ${e.message}`);
                }
            }

            return new Response(JSON.stringify({ success, error: success ? null : lastError, version: VERSION }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: success ? 200 : 400
            });
        }

        if (normalizedAction === 'cancel_subscription') {
            const { subscriptionId } = body;
            if (!subscriptionId) return new Response(JSON.stringify({ error: "Missing subscriptionId" }), { status: 400, headers: corsHeaders });

            const modes = [{ key: apiKeyTest, isTest: true, name: 'Test' }, { key: apiKeyLive, isTest: false, name: 'Live' }].filter(m => !!m.key);
            let success = false;
            let lastError = "Cancel failed";

            for (const mode of modes) {
                try {
                    const creem = createCreem({ apiKey: mode.key, testMode: mode.isTest });
                    await creem.subscriptions.cancel({ subscriptionId, mode: 'immediate' });
                    success = true;
                    break;
                } catch (e: any) { lastError = e.message; }
            }

            return new Response(JSON.stringify({ success, error: success ? null : lastError, version: VERSION }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: success ? 200 : 400
            });
        }

        return new Response(JSON.stringify({ error: "Unsupported Action", version: VERSION }), { status: 400, headers: corsHeaders });

    } catch (error: any) {
        console.error('[EdgeFn] Top-level error:', error.message);
        return new Response(JSON.stringify({ error: error.message, version: VERSION }), { headers: corsHeaders, status: 400 });
    }
})
