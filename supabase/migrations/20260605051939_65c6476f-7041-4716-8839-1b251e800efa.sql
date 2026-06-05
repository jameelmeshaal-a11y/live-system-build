
-- 2.1 Enums + Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'agent');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'agent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "users_read_own_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_manage_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Replaces auth.users trigger: client calls this RPC right after first sign-in.
CREATE OR REPLACE FUNCTION public.claim_admin_if_first()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  assigned public.app_role;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- already has a role? return it
  SELECT role INTO assigned FROM public.user_roles WHERE user_id = uid LIMIT 1;
  IF assigned IS NOT NULL THEN
    RETURN assigned;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'admin');
    RETURN 'admin';
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'agent');
    RETURN 'agent';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_first() TO authenticated;

-- 2.2 Core Tables
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  store_name VARCHAR(150),
  city VARCHAR(80),
  instagram VARCHAR(100),
  notes TEXT,
  source VARCHAR(80),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  dnc BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  total INT NOT NULL DEFAULT 0,
  sent INT NOT NULL DEFAULT 0,
  replied INT NOT NULL DEFAULT 0,
  converted INT NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.campaign_contacts (
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, contact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_contacts TO authenticated;
GRANT ALL ON public.campaign_contacts TO service_role;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('agent','merchant')),
  message TEXT NOT NULL,
  state VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conversations_contact_id_idx ON public.conversations(contact_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  template_name VARCHAR(100),
  payload JSONB,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX message_queue_status_idx ON public.message_queue(status, scheduled_for);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_queue TO authenticated;
GRANT ALL ON public.message_queue TO service_role;
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'ar',
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.settings(key, value) VALUES
  ('whatsapp_config', '{"phone_number_id":"","access_token":"","waba_id":"","verify_token":"","api_version":"v20.0"}'::jsonb),
  ('sending_schedule', '{"start_hour":9,"end_hour":21,"timezone":"Asia/Riyadh"}'::jsonb),
  ('warm_up', '{"daily_limit":50,"week":1}'::jsonb),
  ('system_prompt', '"أنت نور، مستشارة مبيعات دافئة ومتفهمة لمنصة العبايات في السعودية. تحدثي بلهجة خليجية ودودة، اطرحي أسئلة قصيرة، استمعي أكثر مما تتحدثين، ولا تضغطي على التاجر. هدفك: فهم احتياجاته ثم تأهيله للانضمام للمنصة. ردي بنفس لغة التاجر."'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE public.human_takeover (
  contact_id UUID PRIMARY KEY REFERENCES public.contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.human_takeover TO authenticated;
GRANT ALL ON public.human_takeover TO service_role;
ALTER TABLE public.human_takeover ENABLE ROW LEVEL SECURITY;

-- 2.3 RLS Policies
-- Read: any authenticated user
CREATE POLICY "auth_read" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.campaign_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.message_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.human_takeover FOR SELECT TO authenticated USING (true);

-- Write: admins only (except conversations/human_takeover where agents can also act)
CREATE POLICY "admin_write" ON public.contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_write" ON public.campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_write" ON public.campaign_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_write" ON public.templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_write" ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_write" ON public.message_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Agents and admins can write to conversations & toggle human_takeover
CREATE POLICY "agents_write_conversations" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "agents_write_takeover" ON public.human_takeover FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Realtime
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.message_queue REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_queue;
