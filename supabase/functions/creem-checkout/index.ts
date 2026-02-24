
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

        if (['get_history', 'check_history', 'get_transactions', 'history'].includes(normalizedAction)) {
            const targetEmail = (email || '').toLowerCase().trim();
            const allTransactions: any[] = [];
            const debugInfo: any = {};

            const modes = [
                { key: apiKeyTest, base: 'https://test-api.creem.io', name: 'Test' },
                { key: apiKeyLive, base: 'https://api.creem.io', name: 'Live' }
            ];

            for (const mode of modes) {
                if (!mode.key) continue;

                try {
                    // 1. List Recent Customers to find target
                    const cResp = await fetch(`${mode.base}/v1/customers?limit=20`, { headers: { 'x-api-key': mode.key } });
                    if (cResp.ok) {
                        const cData = await cResp.json();
                        const customerList = Array.isArray(cData) ? cData : (cData.data || []);
                        debugInfo[mode.name] = `CONNECTED. Total customers found: ${customerList.length}. Samples: ${customerList.slice(0, 3).map((c: any) => c.email).join(', ')}`;

                        const customer = customerList.find((c: any) => c.email?.toLowerCase().trim() === targetEmail);
                        if (customer) {
                            const tResp = await fetch(`${mode.base}/v1/transactions/search?customer=${customer.id}`, { headers: { 'x-api-key': mode.key } });
                            if (tResp.ok) {
                                const tData = await tResp.json();
                                (Array.isArray(tData) ? tData : (tData.transactions || [])).forEach((t: any) => {
                                    if (!allTransactions.find(it => it.id === t.id)) allTransactions.push({ ...t, source: mode.name });
                                });
                            }
                        }
                    }

                    // 2. Direct Transaction Scan as backup
                    const trResp = await fetch(`${mode.base}/v1/transactions?limit=20`, { headers: { 'x-api-key': mode.key } });
                    if (trResp.ok) {
                        const trData = await trResp.json();
                        (Array.isArray(trData) ? trData : (trData.transactions || [])).forEach((t: any) => {
                            const mEmail = (t.customer_email || t.customer?.email || '').toLowerCase().trim();
                            if (mEmail === targetEmail && !allTransactions.find(it => it.id === t.id)) {
                                allTransactions.push({ ...t, source: mode.name });
                            }
                        });
                    }
                } catch (e) {
                    debugInfo[mode.name] = `ERROR: ${e.message}`;
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

        return new Response(JSON.stringify({ error: "Unsupported", version: VERSION }), { status: 400, headers: corsHeaders });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message, version: VERSION }), { headers: corsHeaders, status: 400 });
    }
})
