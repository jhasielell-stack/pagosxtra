-- Drop foreign key constraints that require user_id/approver_id to exist in profiles
-- This allows local-auth users (not in Supabase auth.users) to create payment requests
ALTER TABLE public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_user_id_fkey;
ALTER TABLE public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_approver_id_fkey;

-- Also drop the notifications foreign keys for the same reason
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_request_id_fkey;

-- Make user_id nullable since local-auth users may not always have a Supabase UUID
ALTER TABLE public.payment_requests ALTER COLUMN user_id DROP NOT NULL;
