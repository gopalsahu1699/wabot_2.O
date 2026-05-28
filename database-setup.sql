-- ============================================
-- WaBot AI - Complete Database Setup
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 1. TABLES
-- ============================================

-- Bot Settings (singleton row for connection status)
CREATE TABLE IF NOT EXISTS public.bot_settings (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  is_bot_enabled boolean NULL DEFAULT false,
  session_status text NULL DEFAULT 'disconnected',
  qr_code text NULL,
  bot_name text NULL DEFAULT 'WaBot AI',
  reply_delay integer NULL DEFAULT 5,
  max_messages_per_day integer NULL DEFAULT 200,
  training_data jsonb NULL,
  CONSTRAINT bot_settings_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  created_at timestamp with time zone NULL DEFAULT now(),
  name text NOT NULL,
  phone_number text NOT NULL,
  group_name text NULL,
  last_used_date timestamp with time zone NULL,
  CONSTRAINT contacts_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Message Templates
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  created_at timestamp with time zone NULL DEFAULT now(),
  name text NOT NULL,
  content text NOT NULL,
  image_url text NULL,
  CONSTRAINT templates_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  created_at timestamp with time zone NULL DEFAULT now(),
  target_group text NULL,
  template_id uuid NULL,
  min_delay integer NULL DEFAULT 40,
  max_delay integer NULL DEFAULT 150,
  status text NULL DEFAULT 'pending',
  progress integer NULL DEFAULT 0,
  total_count integer NULL DEFAULT 0,
  sent_count integer NULL DEFAULT 0,
  failed_count integer NULL DEFAULT 0,
  started_at timestamp with time zone NULL,
  completed_at timestamp with time zone NULL,
  error text NULL,
  CONSTRAINT campaigns_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- AI Training
CREATE TABLE IF NOT EXISTS public.ai_training (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  created_at timestamp with time zone NULL DEFAULT now(),
  company_details text NULL,
  product_details text NULL,
  customer_support_details text NULL,
  bot_behavior text NULL,
  CONSTRAINT ai_training_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_training ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS POLICIES
-- ============================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow all bot_settings" ON public.bot_settings;
DROP POLICY IF EXISTS "Allow all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow all templates" ON public.templates;
DROP POLICY IF EXISTS "Allow all campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow all ai_training" ON public.ai_training;

-- Bot Settings (worker uses anon key)
CREATE POLICY "bot_settings_anon_all" ON public.bot_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "bot_settings_auth_all" ON public.bot_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contacts (worker uses anon key to read contacts for campaigns)
CREATE POLICY "contacts_anon_all" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "contacts_auth_all" ON public.contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Templates (worker uses anon key to read templates for campaigns)
CREATE POLICY "templates_anon_all" ON public.templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "templates_auth_all" ON public.templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Campaigns (worker uses anon key to process)
CREATE POLICY "campaigns_anon_all" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "campaigns_auth_all" ON public.campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AI Training (worker reads training data with anon key)
CREATE POLICY "ai_training_anon_all" ON public.ai_training FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ai_training_auth_all" ON public.ai_training FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 4. STORAGE BUCKETS
-- ============================================

-- Template media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template-images',
  'template-images',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'video/mp4']
) ON CONFLICT (id) DO NOTHING;

-- WhatsApp session backup bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-sessions',
  'whatsapp-sessions',
  false,
  1048576,
  ARRAY['application/json']
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. STORAGE POLICIES
-- ============================================

-- Drop old storage policies
DROP POLICY IF EXISTS "Allow authenticated upload on template-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on template-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete on template-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon full access on whatsapp-sessions" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated full access on whatsapp-sessions" ON storage.objects;

CREATE POLICY "template_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'template-images');

CREATE POLICY "template_images_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'template-images');

CREATE POLICY "template_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'template-images');

CREATE POLICY "whatsapp_sessions_all" ON storage.objects
  FOR ALL
  USING (bucket_id = 'whatsapp-sessions');

-- ============================================
-- 6. DEFAULT BOT_SETTINGS ROW
-- ============================================

INSERT INTO public.bot_settings (id, is_bot_enabled, session_status, qr_code)
VALUES ('11111111-1111-1111-1111-111111111111', false, 'disconnected', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DONE! All tables, RLS, and storage configured.
-- ============================================
