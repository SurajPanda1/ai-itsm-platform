BEGIN;

CREATE TABLE IF NOT EXISTS assignment_group_roles (
  assignment_group_id uuid NOT NULL REFERENCES assignment_groups(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (assignment_group_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES users(id),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

-- Preserve every existing elevated role as a direct compatibility grant.
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, u.role_id
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.name <> 'EMPLOYEE'
ON CONFLICT DO NOTHING;

-- Service Desk membership grants the normal IT Agent capability.
INSERT INTO assignment_group_roles (assignment_group_id, role_id)
SELECT g.id, r.id
FROM assignment_groups g
CROSS JOIN roles r
WHERE g.name = 'Service Desk' AND r.name = 'IT_AGENT'
ON CONFLICT DO NOTHING;

COMMIT;
