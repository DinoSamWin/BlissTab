
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// --- Configuration ---
// Retrieve these from your Supabase Dashboard > Settings > Functions > Secrets
// --- Constants ---
const CREEM_API_KEY = Deno.env.get('CREEM_API_KEY') || '';
const CREEM_PRODUCT_ID_PRO_MONTHLY = Deno.env.get('CREEM_PRODUCT_ID_PRO_MONTHLY') || '';
const CREEM_PRODUCT_ID_PRO_YEARLY = Deno.env.get('CREEM_PRODUCT_ID_PRO_YEARLY') || '';
const CREEM_PRODUCT_ID_LIFETIME = Deno.env.get('CREEM_PRODUCT_ID_LIFETIME') || '';

const CREEM_API_KEY_TEST = Deno.env.get('CREEM_API_KEY_TEST') || '';
const CREEM_PRODUCT_ID_PRO_MONTHLY_TEST = Deno.env.get('CREEM_PRODUCT_ID_PRO_MONTHLY_TEST') || '';
const CREEM_PRODUCT_ID_PRO_YEARLY_TEST = Deno.env.get('CREEM_PRODUCT_ID_PRO_YEARLY_TEST') || '';
const CREEM_PRODUCT_ID_LIFETIME_TEST = Deno.env.get('CREEM_PRODUCT_ID_LIFETIME_TEST') || '';

// --- CORS Headers ---
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 405,
        })
    }

    try {
        const { productId, email, action, testMode } = await req.json();

        // Determine effective mode: Override if testMode param provided, else use env var
        const effectiveTestMode = testMode !== undefined
            ? testMode
            : (Deno.env.get('CREEM_TEST_MODE') === 'true');

        const activeCreemApiBase = effectiveTestMode ? 'https://test-api.creem.io' : 'https://api.creem.io';
        const activeCreemApiKey = effectiveTestMode ? (CREEM_API_KEY_TEST || CREEM_API_KEY) : CREEM_API_KEY;

        const activeProductIdProMonthly = effectiveTestMode ? (CREEM_PRODUCT_ID_PRO_MONTHLY_TEST || CREEM_PRODUCT_ID_PRO_MONTHLY) : CREEM_PRODUCT_ID_PRO_MONTHLY;
        const activeProductIdProYearly = effectiveTestMode ? (CREEM_PRODUCT_ID_PRO_YEARLY_TEST || CREEM_PRODUCT_ID_PRO_YEARLY) : CREEM_PRODUCT_ID_PRO_YEARLY;
        const activeProductIdLifetime = effectiveTestMode ? (CREEM_PRODUCT_ID_LIFETIME_TEST || CREEM_PRODUCT_ID_LIFETIME) : CREEM_PRODUCT_ID_LIFETIME;

        // 1. Create Checkout Session
        if (action === 'create_checkout') {
            if (!productId) {
                throw new Error('productId is required');
            }

            // Map internal product IDs to Creem Product IDs
            let creemProductId = productId;
            if (productId === 'pro_monthly') creemProductId = activeProductIdProMonthly;
            else if (productId === 'pro_yearly') creemProductId = activeProductIdProYearly;
            else if (productId === 'lifetime') creemProductId = activeProductIdLifetime;

            // Fallback: if no mapping found, assume the frontend passed the raw ID
            if (!creemProductId) {
                console.warn(`No mapping found for productId: ${productId}, using as is.`);
                creemProductId = productId;
            }

            console.log(`Creating checkout session for product: ${creemProductId}, user: ${email}`);

            // Call Creem API - Using correct endpoint from official docs
            // Docs: https://docs.creem.io/code/checkout
            const response = await fetch(`${activeCreemApiBase}/v1/checkouts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': activeCreemApiKey,
                },
                body: JSON.stringify({
                    product_id: creemProductId,
                    customer: email ? { email } : undefined,
                    success_url: `${req.headers.get('origin')}/subscription?success=true`,
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('Creem API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errText,
                    productId: creemProductId,
                    email
                });
                throw new Error(`Creem API failed: ${response.status} - ${errText}`);
            }

            const data = await response.json();

            return new Response(
                JSON.stringify({
                    checkout_url: data.checkout_url,
                    session_id: data.id
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        }

        // 2. Create Customer Portal Session
        if (action === 'create_portal') {
            // Call Creem API for portal
            const response = await fetch('https://api.creem.io/v1/portal/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': activeCreemApiKey,
                },
                body: JSON.stringify({
                    customer_email: email, // You might need customer_id stored in DB instead
                    return_url: `${req.headers.get('origin')}/subscription`,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create portal session');
            }

            const data = await response.json();
            return new Response(
                JSON.stringify({ portal_url: data.url }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        throw new Error('Invalid action');

    } catch (error) {
        console.error('Error:', error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
