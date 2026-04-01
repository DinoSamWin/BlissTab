-- Add mapping columns for Creem to track payments by ID and alternate emails
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS creem_customer_id TEXT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS payment_email TEXT;

-- Indexing for performance in history retrieval
CREATE INDEX IF NOT EXISTS idx_subs_creem_customer_id ON public.user_subscriptions(creem_customer_id);
CREATE INDEX IF NOT EXISTS idx_subs_payment_email ON public.user_subscriptions(payment_email);
