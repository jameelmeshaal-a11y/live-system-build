
-- Fix RLS on settings table to allow admins to write
DROP POLICY IF EXISTS "settings_select_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_admin_write" ON public.settings;
DROP POLICY IF EXISTS "settings_admin_all" ON public.settings;
DROP POLICY IF EXISTS "allow_authenticated_all" ON public.settings;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_authenticated" ON public.settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_admin_all" ON public.settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
