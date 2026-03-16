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
 * @param userId User's UUID (required for account binding)
 */
export async function createCheckoutSession(productId: string, email?: string, userId?: string): Promise<string> {
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
        const urlEnv = (import.meta as any).env["VITE_SUPABASE_FUNCTIONS_URL"];
        const supUrl = (import.meta as any).env["VITE_SUPABASE_URL"];
        const fallbackUrl = supUrl ? `${supUrl}/functions/v1` : '';
        const baseUrl = (urlEnv || fallbackUrl || '').replace(/\/$/, '');
        const functionsUrl = `${baseUrl}/creem-checkout`;
        
        const localAnonKey = (import.meta as any).env["VITE_SUPABASE_ANON_KEY"] || '';

        // FLAT LOGGING - EXTREMELY IMPORTANT FOR PRODUCTION DEBUGGING
        console.log(`[DEBUG-KEY] Length: ${localAnonKey.length}`);
        console.log(`[DEBUG-KEY] Starts: ${localAnonKey ? localAnonKey.substring(0, 10) : 'NONE'}...`);
        console.log(`[DEBUG-KEY] Ends: ...${localAnonKey ? localAnonKey.substring(localAnonKey.length - 10) : 'NONE'}`);
        console.log(`[DEBUG-URL] ${functionsUrl}`);

        if (!localAnonKey) {
            console.error('[CreemService] CRITICAL: VITE_SUPABASE_ANON_KEY IS UNDEFINED IN BUNDLE');
            throw new Error('Supabase configuration missing');
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'apikey': localAnonKey,
            'Authorization': `Bearer ${localAnonKey}`,
            'x-client-info': 'supabase-js/2.39.1'
        };

        const makeRequest = async (currentHeaders: Record<string, string>) => {
            return await fetch(functionsUrl, {
                method: 'POST',
                headers: currentHeaders,
                body: JSON.stringify({
                    productId,
                    email,
                    userId,
                    action: 'create_checkout',
                    testMode: import.meta.env.VITE_CREEM_TEST_MODE === 'true'
                })
            });
        };

        let response = await makeRequest(headers);

        // FALLBACK: If 401, some gateways prefer ONLY the apikey header without Authorization
        if (response.status === 401) {
            console.warn('[CreemService] 401 error detected, trying fallback without Authorization header...');
            const fallbackHeaders = { ...headers };
            delete fallbackHeaders['Authorization'];
            const fallbackResponse = await makeRequest(fallbackHeaders);
            if (fallbackResponse.ok) {
                response = fallbackResponse;
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorData: any = {};
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText };
            }
            console.error('[CreemService] Function error status:', response.status, errorData);
            throw new Error(errorData.error || errorData.message || `Edge Function returned a ${response.status} status code`);
        }

        const data = await response.json();
        console.log('[CreemService] Backend response data:', data);

        if (data && data.success === false) {
            throw new Error(data.error || 'Failed to initiate checkout (backend error)');
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
    try {
        const urlEnv = (import.meta as any).env["VITE_SUPABASE_FUNCTIONS_URL"];
        const supUrl = (import.meta as any).env["VITE_SUPABASE_URL"];
        const fallbackUrl = supUrl ? `${supUrl}/functions/v1` : '';
        const baseUrl = (urlEnv || fallbackUrl || '').replace(/\/$/, '');
        const functionsUrl = `${baseUrl}/creem-checkout`;
        const localAnonKey = (import.meta as any).env["VITE_SUPABASE_ANON_KEY"] || '';

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'apikey': localAnonKey,
            'Authorization': `Bearer ${localAnonKey}`,
            'x-client-info': 'supabase-js/2.39.1'
        };

        const makeRequest = async (currentHeaders: Record<string, string>) => {
            return await fetch(functionsUrl, {
                method: 'POST',
                headers: currentHeaders,
                body: JSON.stringify(body)
            });
        };

        let response = await makeRequest(headers);

        if (response.status === 401) {
            console.warn('[CreemService] 401 in helper, attempting key-only fallback...');
            const fallbackHeaders = { ...headers };
            delete fallbackHeaders['Authorization'];
            const fallbackResponse = await makeRequest(fallbackHeaders);
            if (fallbackResponse.ok) {
                response = fallbackResponse;
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorData: any = {};
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText };
            }
            console.error('[CreemService] Function error status:', response.status, errorData);
            throw new Error(errorData.error || errorData.message || `Function invocation failed with status ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[CreemService] Function invocation failed:', error);
        throw error;
    }
}

/**
 * Wake up the edge function to avoid first-click cold start
 */
export async function pingCreem(): Promise<void> {
    try {
        await invokeCreemFunction({ action: 'ping' });
        console.log('[CreemService] Function warmed up');
    } catch (e) {
        // Ignore ping errors
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

/**
 * Refund a specific transaction and optionally cancel its associated subscription immediately.
 */
export async function refundTransaction(transactionId: string, subscriptionId?: string): Promise<boolean> {
    const isMock = !import.meta.env.VITE_SUPABASE_URL || (!import.meta.env.VITE_SUPABASE_FUNCTIONS_URL && import.meta.env.DEV);

    if (isMock) {
        console.log('[CreemService] Mocking refund for transaction:', transactionId);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return true;
    }

    try {
        const data = await invokeCreemFunction({
            action: 'refund_transaction',
            transactionId,
            subscriptionId,
            testMode: import.meta.env.DEV || import.meta.env.VITE_CREEM_TEST_MODE === 'true'
        });

        return data?.success || false;
    } catch (error) {
        console.error('[CreemService] Failed to process refund:', error);
        throw error;
    }
}
