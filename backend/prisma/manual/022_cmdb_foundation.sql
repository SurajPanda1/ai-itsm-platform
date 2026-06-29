CREATE TABLE IF NOT EXISTS ci_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ci_categories_org_name_key UNIQUE (organization_id, name)
);

ALTER TABLE configuration_items ADD COLUMN IF NOT EXISTS ci_number varchar(30);
ALTER TABLE configuration_items ADD COLUMN IF NOT EXISTS ci_category_id uuid REFERENCES ci_categories(id);
ALTER TABLE configuration_items ADD COLUMN IF NOT EXISTS environment varchar(30);
ALTER TABLE configuration_items ADD COLUMN IF NOT EXISTS criticality varchar(20) DEFAULT 'MEDIUM';
ALTER TABLE configuration_items ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_configuration_items_org_ci_number
  ON configuration_items (organization_id, ci_number)
  WHERE ci_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_configuration_items_org_name
  ON configuration_items (organization_id, name);

CREATE INDEX IF NOT EXISTS idx_configuration_items_org_active
  ON configuration_items (organization_id, active);

CREATE INDEX IF NOT EXISTS idx_configuration_items_category
  ON configuration_items (ci_category_id);

CREATE TABLE IF NOT EXISTS ci_relationship_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ci_relationship_types ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS ci_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_ci_id uuid NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
  child_ci_id uuid NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
  relationship_type_id uuid NOT NULL REFERENCES ci_relationship_types(id),
  status varchar(30) NOT NULL DEFAULT 'ACTIVE',
  description text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ci_relationships_not_self CHECK (parent_ci_id <> child_ci_id),
  CONSTRAINT ci_relationships_unique UNIQUE (organization_id, parent_ci_id, child_ci_id, relationship_type_id)
);

CREATE INDEX IF NOT EXISTS idx_ci_relationships_org_status ON ci_relationships (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ci_relationships_parent ON ci_relationships (parent_ci_id);
CREATE INDEX IF NOT EXISTS idx_ci_relationships_child ON ci_relationships (child_ci_id);

INSERT INTO statuses(module, name, description)
VALUES
  ('CMDB', 'ACTIVE', 'Active CI'),
  ('CMDB', 'INACTIVE', 'Inactive CI'),
  ('CMDB', 'RETIRED', 'Retired CI'),
  ('CMDB', 'UNKNOWN', 'Unknown CI status')
ON CONFLICT (module, name) DO NOTHING;

INSERT INTO ci_types(name, description)
VALUES
  ('Server', 'Physical server'),
  ('Virtual Machine', 'Virtual machine'),
  ('Database', 'Database'),
  ('Application', 'Application'),
  ('Website', 'Website'),
  ('API', 'API service'),
  ('Load Balancer', 'Load balancer'),
  ('Firewall', 'Firewall'),
  ('Router', 'Router'),
  ('Switch', 'Switch'),
  ('Storage', 'Storage platform'),
  ('Kubernetes Cluster', 'Kubernetes cluster'),
  ('Docker Container', 'Docker container'),
  ('AWS EC2', 'AWS EC2 instance'),
  ('Azure VM', 'Azure virtual machine'),
  ('Business Service', 'Business service'),
  ('Service Account', 'Service account'),
  ('Integration Account', 'Integration account'),
  ('Database Account', 'Database account'),
  ('SSL Certificate', 'SSL certificate'),
  ('Domain', 'Domain name'),
  ('Printer', 'Printer'),
  ('Laptop', 'Laptop')
ON CONFLICT (name) DO NOTHING;

INSERT INTO ci_types(name, description)
VALUES
  ('Network Device', 'Generic network device'),
  ('Cloud Resource', 'Generic cloud resource')
ON CONFLICT (name) DO NOTHING;

UPDATE configuration_items ci
SET ci_type_id = target.id
FROM ci_types source, ci_types target
WHERE ci.ci_type_id = source.id
  AND source.name = 'SERVER'
  AND target.name = 'Server';

UPDATE configuration_items ci
SET ci_type_id = target.id
FROM ci_types source, ci_types target
WHERE ci.ci_type_id = source.id
  AND source.name = 'DATABASE'
  AND target.name = 'Database';

UPDATE configuration_items ci
SET ci_type_id = target.id
FROM ci_types source, ci_types target
WHERE ci.ci_type_id = source.id
  AND source.name = 'APPLICATION'
  AND target.name = 'Application';

UPDATE configuration_items ci
SET ci_type_id = target.id
FROM ci_types source, ci_types target
WHERE ci.ci_type_id = source.id
  AND source.name = 'NETWORK_DEVICE'
  AND target.name = 'Network Device';

UPDATE configuration_items ci
SET ci_type_id = target.id
FROM ci_types source, ci_types target
WHERE ci.ci_type_id = source.id
  AND source.name = 'CLOUD_RESOURCE'
  AND target.name = 'Cloud Resource';

DELETE FROM ci_types
WHERE name IN ('SERVER', 'DATABASE', 'APPLICATION', 'NETWORK_DEVICE', 'CLOUD_RESOURCE')
  AND NOT EXISTS (SELECT 1 FROM configuration_items WHERE configuration_items.ci_type_id = ci_types.id);

INSERT INTO ci_relationship_types(name, description)
VALUES
  ('Runs On', 'Child runs on parent'),
  ('Hosted On', 'Child is hosted on parent'),
  ('Depends On', 'Parent depends on child'),
  ('Connected To', 'CIs are connected'),
  ('Contains', 'Parent contains child'),
  ('Uses', 'Parent uses child'),
  ('Backup Of', 'Child is backup of parent'),
  ('Replicated To', 'Parent replicates to child'),
  ('Managed By', 'Parent is managed by child'),
  ('Owned By', 'Parent is owned by child')
ON CONFLICT (name) DO NOTHING;

INSERT INTO ci_categories(organization_id, name, description)
SELECT o.id, category.name, category.description
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
ON CONFLICT (organization_id, name) DO NOTHING;
