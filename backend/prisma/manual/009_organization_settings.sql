ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS branding_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attachment_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

