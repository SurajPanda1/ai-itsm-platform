CREATE TABLE IF NOT EXISTS service_portal_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  portal_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  portal_name VARCHAR(120) NOT NULL DEFAULT 'Service Portal',
  welcome_message TEXT NOT NULL DEFAULT 'How can we help today?',
  default_landing_page VARCHAR(40) NOT NULL DEFAULT 'HOME',
  knowledge_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  allow_kb_search BOOLEAN NOT NULL DEFAULT TRUE,
  allow_kb_ratings BOOLEAN NOT NULL DEFAULT FALSE,
  banner_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  banner_message TEXT,
  banner_background_color VARCHAR(20) NOT NULL DEFAULT '#dc2626',
  banner_text_color VARCHAR(20) NOT NULL DEFAULT '#ffffff',
  banner_priority VARCHAR(20) NOT NULL DEFAULT 'INFORMATION',
  allow_incident_creation BOOLEAN NOT NULL DEFAULT TRUE,
  allow_service_requests BOOLEAN NOT NULL DEFAULT TRUE,
  allow_employee_close_ticket BOOLEAN NOT NULL DEFAULT FALSE,
  show_recent_tickets BOOLEAN NOT NULL DEFAULT TRUE,
  show_my_requests BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_articles
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(30) NOT NULL DEFAULT 'EMPLOYEES';

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_portal_visibility
  ON knowledge_articles(organization_id, status, visibility);
