-- 20240628_allow_anon_update_bot_settings.sql
-- Grant the anon role permission to insert and update all columns in bot_settings.
-- This is safe for a development environment where we only have a single
-- row (identified by the fixed SETTINGS_ID).

-- INSERT policy for the anon role
CREATE POLICY "anon_can_insert_bot_settings"
  ON public.bot_settings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- UPDATE policy for the anon role
CREATE POLICY "anon_can_update_bot_settings"
  ON public.bot_settings
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
