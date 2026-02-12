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
export async function getCustomerPortalUrl(): Promise<string> {
    const client = getSupabaseClient();

    // MOCK MODE
    const hasFunctionsUrl = !!import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;

    if (!client || (!hasFunctionsUrl && import.meta.env.DEV)) {
        console.log('[CreemService] Mocking customer portal URL');
        await new Promise(resolve => setTimeout(resolve, 800));
        return 'https://creem.io/billing';
    }

    try {
        const { data, error } = await client.functions.invoke<PortalSessionResponse>('creem-checkout', {
            body: {
                action: 'create_portal'
            }
        });

        if (error) {
            throw error;
        }

        return data?.portal_url || '#';
    } catch (error) {
        console.error('[CreemService] Failed to get portal URL:', error);
        // Fallback to generic link or throw
        return '#';
    }
}
