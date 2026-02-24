import { getSupabaseClient } from './supabaseService';

// Service for handling Creem payment integration

/**
 * Interface for the checkout session response from backend
 */
interface CheckoutSessionResponse {
    checkout_url: string;
    session_id: string;
}

/**
 * Interface for the customer portal response from backend
 */
interface PortalSessionResponse {
    portal_url: string;
}

/**
 * Create a checkout session for a specific product
 * @param productId The Creem product ID to subscribe to
 * @param email User's email (optional, for pre-filling)
 */
export async function createCheckoutSession(productId: string, email?: string): Promise<string> {
    const client = getSupabaseClient();

    // MOCK MODE: If Supabase CLI/Edge Functions are not set up locally or client is missing,
    // we simulate a success for testing UI flow.
    // Logic: If we have a FUNCTIONS_URL, we try to use it. If not, we fall back to mock.
    const hasFunctionsUrl = !!import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;

    if (!client || (!hasFunctionsUrl && import.meta.env.DEV)) {
        console.log('[CreemService] Mocking checkout session creation for:', productId);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate returning URL
        // Return a dummy URL that would normally go to Creem
        return 'https://creem.io/checkout/mock-session-id';
    }

    try {
        const { data, error } = await client.functions.invoke<CheckoutSessionResponse>('creem-checkout', {
            body: {
                productId,
                email,
                action: 'create_checkout',
                testMode: import.meta.env.DEV || import.meta.env.VITE_CREEM_TEST_MODE === 'true'
            }
        });

        if (error) {
            console.error('[CreemService] Function error:', error);
            throw new Error(error.message || 'Failed to initiate checkout');
        }

        if (!data?.checkout_url) {
            throw new Error('No checkout URL returned from backend');
        }

        return data.checkout_url;
    } catch (error) {
        console.error('[CreemService] Checkout creation failed:', error);
        throw error;
    }
}

/**
 * Get the customer portal URL for managing subscriptions
 */
export async function getCustomerPortalUrl(email?: string): Promise<string> {
    const client = getSupabaseClient();

    // MOCK MODE
    const hasFunctionsUrl = !!import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;

    if (!client || (!hasFunctionsUrl && import.meta.env.DEV)) {
        console.log('[CreemService] Mocking customer portal URL');
        await new Promise(resolve => setTimeout(resolve, 800));
        return 'https://creem.io/billing';
    }

    try {
        const data = await invokeCreemFunction({
            action: 'create_portal',
            email,
            testMode: import.meta.env.DEV || import.meta.env.VITE_CREEM_TEST_MODE === 'true'
        });

        return data?.portal_url || 'https://creem.io/customer/login';
    } catch (error) {
        console.error('[CreemService] Failed to get portal URL:', error);
        return 'https://creem.io/customer/login';
    }
}

/**
 * Helper to call the creem-checkout Edge Function
 */
async function invokeCreemFunction(body: any): Promise<any> {
    const client = getSupabaseClient();
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/creem-checkout`;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    try {
        // Try to get current session to pass as Bearer token
        const { data: { session } } = await client.auth.getSession();

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': anonKey
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Function returned ${response.status}`);
        }

        return result;
    } catch (error) {
        console.error('[CreemService] Function invocation failed:', error);
        throw error;
    }
}

/**
 * Get the transaction history for a user
 */
export async function getTransactionHistory(email: string): Promise<any[]> {
    const isMock = !import.meta.env.VITE_SUPABASE_URL || (!import.meta.env.VITE_SUPABASE_FUNCTIONS_URL && import.meta.env.DEV);

    if (isMock) {
        console.log('[CreemService] Mocking transaction history for:', email);
        return [
            { id: 'tx_1', amount: 9.99, currency: 'USD', status: 'completed', created_at: new Date().toISOString(), product_name: 'Pro Monthly', subscription_id: 'sub_1' },
            { id: 'tx_2', amount: 99.00, currency: 'USD', status: 'refunded', created_at: new Date(Date.now() - 86400000 * 30).toISOString(), product_name: 'Pro Yearly' }
        ];
    }

    try {
        console.log('[CreemService] Fetching history for:', email);
        const forceLive = import.meta.env.VITE_CREEM_TEST_MODE === 'false';
        const data = await invokeCreemFunction({
            action: 'get_history',
            email,
            testMode: forceLive ? false : (import.meta.env.DEV || import.meta.env.VITE_CREEM_TEST_MODE === 'true')
        });

        return data?.transactions || [];
    } catch (error) {
        console.error('[CreemService] Failed to get transaction history:', error);
        throw error; // Let UI show the actual error
    }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
    const isMock = !import.meta.env.VITE_SUPABASE_URL || (!import.meta.env.VITE_SUPABASE_FUNCTIONS_URL && import.meta.env.DEV);

    if (isMock) {
        console.log('[CreemService] Mocking subscription cancellation for:', subscriptionId);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
    }

    try {
        const data = await invokeCreemFunction({
            action: 'cancel_subscription',
            subscriptionId,
            testMode: import.meta.env.DEV || import.meta.env.VITE_CREEM_TEST_MODE === 'true'
        });

        return data?.success || false;
    } catch (error) {
        console.error('[CreemService] Failed to cancel subscription:', error);
        throw error;
    }
}
