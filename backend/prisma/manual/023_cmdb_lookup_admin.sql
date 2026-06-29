ALTER TABLE ci_types ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE ci_types ADD COLUMN IF NOT EXISTS category_id uuid;
ALTER TABLE ci_types ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE ci_types ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone NOT NULL DEFAULT now();

INSERT INTO ci_categories(organization_id, name, description, active)
SELECT o.id, category.name, category.description, true
FROM organizations o
CROSS JOIN (VALUES
  ('Infrastructure', 'Infrastructure components'),
  ('Software', 'Software assets'),
  ('Cloud', 'Cloud resources'),
  ('Network', 'Network components'),
  ('Services', 'Business and technical services'),
  ('Accounts', 'Service and integration accounts'),
  ('End User Devices', 'End user devices'),
  ('Other', 'Other CIs')
) AS category(name, description)
ON CONFLICT (organization_id, name) DO UPDATE SET active = true;

UPDATE ci_types t
SET organization_id = ci.organization_id
FROM configuration_items ci
WHERE ci.ci_type_id = t.id
  AND t.organization_id IS NULL;

UPDATE ci_types t
SET organization_id = o.id
FROM organizations o
WHERE t.organization_id IS NULL;

UPDATE ci_types t
SET category_id = c.id
FROM ci_categories c
WHERE c.organization_id = t.organization_id
  AND c.name = CASE
    WHEN t.name IN ('Server', 'Virtual Machine', 'Database', 'Storage') THEN 'Infrastructure'
    WHEN t.name IN ('Application', 'Website', 'API', 'SaaS Application', 'Repository', 'CI/CD Pipeline') THEN 'Software'
    WHEN t.name IN ('AWS EC2', 'Azure VM', 'Cloud Resource', 'Kubernetes Cluster', 'Docker Container') THEN 'Cloud'
    WHEN t.name IN ('Load Balancer', 'Firewall', 'Router', 'Switch', 'Network Device', 'DNS Record', 'IP Address', 'Domain') THEN 'Network'
    WHEN t.name IN ('Business Service') THEN 'Services'
    WHEN t.name IN ('Service Account', 'Integration Account', 'Database Account') THEN 'Accounts'
    WHEN t.name IN ('Laptop', 'Printer') THEN 'End User Devices'
    ELSE 'Other'
  END
  AND t.category_id IS NULL;

UPDATE ci_types t
SET category_id = c.id
FROM ci_categories c
WHERE c.organization_id = t.organization_id
  AND c.name = 'Other'
  AND t.category_id IS NULL;

INSERT INTO ci_types(organization_id, category_id, name, description, active)
SELECT o.id, c.id, type_seed.name, type_seed.description, true
FROM organizations o
JOIN ci_categories c ON c.organization_id = o.id
JOIN (VALUES
  ('Infrastructure', 'Server', 'Physical or logical server'),
  ('Infrastructure', 'Virtual Machine', 'Virtual machine'),
  ('Infrastructure', 'Database', 'Database platform or instance'),
  ('Software', 'Application', 'Application CI'),
  ('Software', 'Website', 'Website CI'),
  ('Software', 'API', 'API endpoint or service'),
  ('Services', 'Business Service', 'Business service'),
  ('Accounts', 'Service Account', 'Service account'),
  ('Network', 'Firewall', 'Firewall device or service'),
  ('Network', 'Router', 'Router'),
  ('Network', 'Switch', 'Switch'),
  ('Network', 'Load Balancer', 'Load balancer'),
  ('Infrastructure', 'Storage', 'Storage system'),
  ('Cloud', 'Kubernetes Cluster', 'Kubernetes cluster'),
  ('Cloud', 'Docker Container', 'Docker container'),
  ('Cloud', 'Cloud Resource', 'Generic cloud resource'),
  ('Other', 'Certificate', 'Certificate such as SSL/TLS'),
  ('Network', 'DNS Record', 'DNS record'),
  ('Network', 'IP Address', 'IP address'),
  ('End User Devices', 'Laptop', 'Laptop'),
  ('End User Devices', 'Printer', 'Printer'),
  ('Software', 'SaaS Application', 'SaaS application'),
  ('Software', 'Repository', 'Source code repository'),
  ('Software', 'CI/CD Pipeline', 'Build or deployment pipeline'),
  ('Other', 'Other', 'Other CI type')
) AS type_seed(category_name, name, description)
  ON type_seed.category_name = c.name
WHERE NOT EXISTS (
  SELECT 1 FROM ci_types existing
  WHERE existing.organization_id = o.id
    AND lower(existing.name) = lower(type_seed.name)
);

UPDATE ci_types t
SET category_id = c.id,
    active = true,
    updated_at = now()
FROM ci_categories c
WHERE c.organization_id = t.organization_id
  AND c.name = CASE
    WHEN t.name IN ('Server', 'Virtual Machine', 'Database', 'Storage') THEN 'Infrastructure'
    WHEN t.name IN ('Application', 'Website', 'API', 'SaaS Application', 'Repository', 'CI/CD Pipeline') THEN 'Software'
    WHEN t.name IN ('AWS EC2', 'Azure VM', 'Cloud Resource', 'Kubernetes Cluster', 'Docker Container') THEN 'Cloud'
    WHEN t.name IN ('Load Balancer', 'Firewall', 'Router', 'Switch', 'Network Device', 'DNS Record', 'IP Address', 'Domain') THEN 'Network'
    WHEN t.name IN ('Business Service') THEN 'Services'
    WHEN t.name IN ('Service Account', 'Integration Account', 'Database Account') THEN 'Accounts'
    WHEN t.name IN ('Laptop', 'Printer') THEN 'End User Devices'
    ELSE 'Other'
  END;

ALTER TABLE ci_types ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE ci_types ALTER COLUMN category_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ci_types_name_key'
  ) THEN
    ALTER TABLE ci_types DROP CONSTRAINT ci_types_name_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ci_types_organization_id_name_key ON ci_types (organization_id, name);
CREATE INDEX IF NOT EXISTS idx_ci_types_org_active ON ci_types (organization_id, active);
CREATE INDEX IF NOT EXISTS idx_ci_types_category ON ci_types (category_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ci_types_organization_id_fkey'
  ) THEN
    ALTER TABLE ci_types
      ADD CONSTRAINT ci_types_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ci_types_category_id_fkey'
  ) THEN
    ALTER TABLE ci_types
      ADD CONSTRAINT ci_types_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES ci_categories(id);
  END IF;
END $$;

ALTER TABLE ci_relationship_types ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE ci_relationship_types ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone NOT NULL DEFAULT now();

INSERT INTO ci_relationship_types(name, description, active)
VALUES
  ('Runs On', 'Child runs on parent', true),
  ('Hosted On', 'Child is hosted on parent', true),
  ('Depends On', 'Parent depends on child', true),
  ('Connected To', 'CIs are connected', true),
  ('Contains', 'Parent contains child', true),
  ('Uses', 'Parent uses child', true),
  ('Backup Of', 'Child is backup of parent', true),
  ('Replicated To', 'Parent replicates to child', true),
  ('Managed By', 'Parent is managed by child', true),
  ('Owned By', 'Parent is owned by child', true)
ON CONFLICT (name) DO UPDATE
SET active = true,
    description = COALESCE(ci_relationship_types.description, EXCLUDED.description),
    updated_at = now();
