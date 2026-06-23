CREATE TABLE IF NOT EXISTS service_catalog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT service_catalog_categories_organization_id_name_key UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS service_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_catalog_categories(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  default_assignment_group_id UUID REFERENCES assignment_groups(id),
  form_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT service_catalog_items_organization_id_name_key UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  requested_for UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  catalog_item_id UUID NOT NULL REFERENCES service_catalog_items(id),
  request_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  fulfillment_notes TEXT,
  fulfilled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO ticket_types (name, description)
VALUES ('SERVICE_REQUEST', 'Service request ticket')
ON CONFLICT (name) DO NOTHING;

INSERT INTO service_catalog_categories (organization_id, name, description)
SELECT id, 'General Requests', 'Default category for common employee service requests'
FROM organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO service_catalog_items (organization_id, category_id, name, description, default_assignment_group_id, form_schema)
SELECT
  o.id,
  c.id,
  'General Service Request',
  'Use this for common service requests until catalogue items are configured.',
  (
    SELECT ag.id
    FROM assignment_groups ag
    WHERE ag.organization_id = o.id AND ag.active = TRUE
    ORDER BY ag.created_at ASC
    LIMIT 1
  ),
  '[{"key":"details","label":"Request details","type":"textarea","required":true}]'::jsonb
FROM organizations o
JOIN service_catalog_categories c ON c.organization_id = o.id AND c.name = 'General Requests'
ON CONFLICT (organization_id, name) DO NOTHING;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS requested_for UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS catalog_item_id UUID REFERENCES service_catalog_items(id),
  ADD COLUMN IF NOT EXISTS request_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP;

UPDATE service_requests sr
SET requested_for = t.created_by
FROM tickets t
WHERE sr.ticket_id = t.id
  AND sr.requested_for IS NULL;

UPDATE service_requests sr
SET catalog_item_id = i.id
FROM tickets t
JOIN service_catalog_items i ON i.organization_id = t.organization_id AND i.name = 'General Service Request'
WHERE sr.ticket_id = t.id
  AND sr.catalog_item_id IS NULL;

ALTER TABLE service_requests
  ALTER COLUMN requested_for SET NOT NULL,
  ALTER COLUMN catalog_item_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS service_catalog_items_category_id_idx ON service_catalog_items(category_id);
CREATE INDEX IF NOT EXISTS service_catalog_items_default_assignment_group_id_idx ON service_catalog_items(default_assignment_group_id);
CREATE INDEX IF NOT EXISTS service_requests_catalog_item_id_idx ON service_requests(catalog_item_id);
CREATE INDEX IF NOT EXISTS service_requests_requested_for_idx ON service_requests(requested_for);
