-- Relax notifications policies for local-auth app (no Supabase session)
DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
CREATE POLICY notifications_insert_anyone
  ON public.notifications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_anyone
  ON public.notifications
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_anyone
  ON public.notifications
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_anyone
  ON public.notifications
  FOR DELETE
  TO anon, authenticated
  USING (true);
