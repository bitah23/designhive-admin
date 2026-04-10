-- ============================================================
-- DesignHive Email Automation - Database Schema
-- Run these statements in your Supabase SQL Editor
-- ============================================================

-- 1. Fix existing profiles table (Add email column if missing)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Backfill existing emails from auth.users
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.id = auth.users.id
  AND (public.profiles.email IS NULL OR public.profiles.email = '');

-- 3. Add Unique Constraint to email
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- 4. Trigger: auto-sync email + name on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'User'),
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name  = EXCLUDED.name,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Email Templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL,
  subject    text NOT NULL,
  body       text NOT NULL,  -- HTML content
  variables  jsonb DEFAULT '["name", "email", "date"]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. Email Logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email    text NOT NULL,
  template_id   uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  status        text CHECK (status IN ('sent', 'failed')) NOT NULL,
  timestamp     timestamp with time zone DEFAULT now(),
  error_message text
);

-- 7. Admins table for dashboard access
CREATE TABLE IF NOT EXISTS public.admins (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamp with time zone DEFAULT now()
);

-- Default admin: admin@designhive.com / admin123
-- Change password after first login by updating password_hash.
-- Generate new hash: python backend/hash_password.py your-new-password
INSERT INTO public.admins (email, password_hash)
SELECT
  'admin@designhive.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBzJQEWlN9YWRS'
WHERE NOT EXISTS (SELECT 1 FROM public.admins WHERE email = 'admin@designhive.com');

-- 8. Seed sample templates
INSERT INTO public.email_templates (title, subject, body, variables)
SELECT
  'Welcome Email',
  'Welcome to Design Hive, {{name}}!',
  '<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to DesignHive!</h1>
  </div>
  <h2 style="color: #1a1a2e;">Hello {{name}}!</h2>
  <p style="color: #555; line-height: 1.6;">
    We are thrilled to have you join our creative community. Your account has been successfully created on <strong>{{date}}</strong>.
  </p>
  <p style="color: #555; line-height: 1.6;">
    Start exploring our platform and unleash your creativity with thousands of design assets and tools.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="#" style="background: #667eea; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Get Started</a>
  </div>
  <p style="color: #999; font-size: 12px; text-align: center;">
    Questions? Reply to this email — we are always happy to help.<br>
    &copy; {{date}} DesignHive. All rights reserved.
  </p>
</body>
</html>',
  '["name", "email", "date"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE title = 'Welcome Email');

INSERT INTO public.email_templates (title, subject, body, variables)
SELECT
  'Monthly Newsletter',
  'DesignHive Monthly Updates — {{date}}',
  '<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1a1a2e; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
    <h1 style="color: #667eea; margin: 0;">DesignHive Monthly</h1>
    <p style="color: #aaa; margin: 8px 0 0;">{{date}}</p>
  </div>
  <h2 style="color: #1a1a2e;">Hi {{name}},</h2>
  <p style="color: #555; line-height: 1.6;">Here is what is new at DesignHive this month:</p>
  <ul style="color: #555; line-height: 2;">
    <li>New design templates added to the library</li>
    <li>Performance improvements across the platform</li>
    <li>Upcoming feature: AI-powered design suggestions</li>
  </ul>
  <p style="color: #555; line-height: 1.6;">
    As always, thank you for being part of our community, {{name}}. We build DesignHive for creators like you.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    You are receiving this because you signed up with {{email}}.<br>
    &copy; DesignHive. All rights reserved.
  </p>
</body>
</html>',
  '["name", "email", "date"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE title = 'Monthly Newsletter');

INSERT INTO public.email_templates (title, subject, body, variables)
SELECT
  'Feature Announcement',
  'Exciting New Feature Coming to DesignHive, {{name}}!',
  '<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0;">Something BIG is coming!</h1>
  </div>
  <h2 style="color: #1a1a2e;">Hey {{name}},</h2>
  <p style="color: #555; line-height: 1.6;">
    We have been working hard behind the scenes and we are excited to announce an upcoming feature that will transform how you design.
  </p>
  <p style="color: #555; line-height: 1.6;">
    Stay tuned for the official launch announcement. You will be among the first to know!
  </p>
  <div style="background: #f8f9fa; border-left: 4px solid #f5576c; padding: 16px; border-radius: 4px; margin: 20px 0;">
    <p style="margin: 0; color: #555; font-style: italic;">
      "Design is not just what it looks like and feels like. Design is how it works." — Steve Jobs
    </p>
  </div>
  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
    You are receiving this at {{email}}. &copy; DesignHive.
  </p>
</body>
</html>',
  '["name", "email", "date"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE title = 'Feature Announcement');

-- 9. Enable Row Level Security
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Backend uses service_role key which bypasses RLS automatically.
-- No public access needed for these tables.
