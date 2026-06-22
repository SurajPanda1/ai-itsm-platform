CREATE TABLE IF NOT EXISTS assignment_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  description text,
  manager_id uuid REFERENCES users(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT assignment_groups_org_name_key UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS assignment_group_members (
  assignment_group_id uuid NOT NULL REFERENCES assignment_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (assignment_group_id, user_id)
);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assignment_group_id uuid;
DO $$ BEGIN
  ALTER TABLE tickets ADD CONSTRAINT tickets_assignment_group_id_fkey
    FOREIGN KEY (assignment_group_id) REFERENCES assignment_groups(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_tickets_assignment_group_id ON tickets(assignment_group_id);

INSERT INTO assignment_groups (organization_id, name, description, manager_id)
SELECT o.id, 'Service Desk', 'Default resolver group',
       (SELECT u.id FROM users u WHERE u.organization_id = o.id ORDER BY u.created_at LIMIT 1)
FROM organizations o
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO assignment_group_members (assignment_group_id, user_id)
SELECT g.id, u.id
FROM assignment_groups g
JOIN users u ON u.organization_id = g.organization_id
JOIN roles r ON r.id = u.role_id
WHERE r.name IN ('IT_AGENT', 'IT_SERVICE_MANAGER', 'ADMIN')
ON CONFLICT DO NOTHING;

UPDATE tickets t
SET assignment_group_id = g.id
FROM assignment_groups g
WHERE g.organization_id = t.organization_id
  AND g.name = 'Service Desk'
  AND t.assignment_group_id IS NULL;
