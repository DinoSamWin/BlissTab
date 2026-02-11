
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// --- Configuration ---
// Retrieve these from your Supabase Dashboard > Settings > Functions > Secrets
const CREEM_API_KEY = Deno.env.get('CREEM_API_KEY') || '';
const CREEM_PRODUCT_ID_PRO_MONTHLY = Deno.env.get('CREEM_PRODUCT_ID_PRO_MONTHLY') || '';
const CREEM_PRODUCT_ID_PRO_YEARLY = Deno.env.get('CREEM_PRODUCT_ID_PRO_YEARLY') || '';
const CREEM_PRODUCT_ID_LIFETIME = Deno.env.get('CREEM_PRODUCT_ID_LIFETIME') || '';

// --- CORS Headers ---
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { productId, email, action } = await req.json();

        // 1. Create Checkout Session
        if (action === 'create_checkout') {
            if (!productId) {
                throw new Error('productId is required');
            }

            // Map internal product IDs to Creem Product IDs
            let creemProductId = productId;
            if (productId === 'pro_monthly') creemProductId = CREEM_PRODUCT_ID_PRO_MONTHLY;
            else if (productId === 'pro_yearly') creemProductId = CREEM_PRODUCT_ID_PRO_YEARLY;
            else if (productId === 'lifetime') creemProductId = CREEM_PRODUCT_ID_LIFETIME;

            // Fallback: if no mapping found, assume the frontend passed the raw ID
            if (!creemProductId) {
                console.warn(`No mapping found for productId: ${productId}, using as is.`);
                creemProductId = productId;
            }

            console.log(`Creating checkout session for product: ${creemProductId}, user: ${email}`);

            // Call Creem API
            // Note: Adjust endpoint based on actual Creem API docs
            const response = await fetch('https://api.creem.io/v1/checkout/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CREEM_API_KEY,
                },
                body: JSON.stringify({
                    product_id: creemProductId,
                    customer_email: email,
                    success_url: `${req.headers.get('origin')}/subscription?success=true`,
                    cancel_url: `${req.headers.get('origin')}/subscription?canceled=true`,
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('Creem API error:', errText);
                throw new Error(`Creem API failed: ${response.status}`);
            }

            const data = await response.json();

            return new Response(
                JSON.stringify({
                    checkout_url: data.url,
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
                    'x-api-key': CREEM_API_KEY,
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
