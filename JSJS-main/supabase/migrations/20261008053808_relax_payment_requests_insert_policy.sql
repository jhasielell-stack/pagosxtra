-- Replace the restrictive INSERT policy with one that allows anyone (anon or authenticated) to insert
DROP POLICY IF EXISTS requests_insert_own ON public.payment_requests;

-- Allow inserts from anyone — the app handles auth locally now
CREATE POLICY requests_insert_anyone
  ON public.payment_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also relax SELECT so the app can read requests without a Supabase session
DROP POLICY IF EXISTS requests_select_scoped ON public.payment_requests;
CREATE POLICY requests_select_anyone
  ON public.payment_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Relax UPDATE so the app can update request status
DROP POLICY IF EXISTS requests_update_scoped ON public.payment_requests;
CREATE POLICY requests_update_anyone
  ON public.payment_requests
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Relax DELETE
DROP POLICY IF EXISTS requests_delete_scoped ON public.payment_requests;
CREATE POLICY requests_delete_anyone
  ON public.payment_requests
  FOR DELETE
  TO anon, authenticated
  USING (true);
