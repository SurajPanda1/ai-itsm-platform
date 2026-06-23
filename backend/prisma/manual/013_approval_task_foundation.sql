ALTER TABLE users
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS manager_required_exempt BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS users_manager_id_idx ON users(manager_id);

ALTER TABLE assignment_groups
  ADD COLUMN IF NOT EXISTS email VARCHAR(150),
  ADD COLUMN IF NOT EXISTS group_type VARCHAR(30) NOT NULL DEFAULT 'FULFILLMENT';

ALTER TABLE service_catalog_items
  ADD COLUMN IF NOT EXISTS task_templates JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS service_approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id UUID NOT NULL REFERENCES service_catalog_items(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  approval_type VARCHAR(30) NOT NULL,
  approval_group_id UUID REFERENCES assignment_groups(id),
  specific_approver_id UUID REFERENCES users(id),
  required BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_approval_rules_catalog_item_id_sequence_idx
  ON service_approval_rules(catalog_item_id, sequence);

CREATE TABLE IF NOT EXISTS service_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  approval_rule_id UUID REFERENCES service_approval_rules(id),
  sequence INTEGER NOT NULL,
  approval_type VARCHAR(30) NOT NULL,
  approver_id UUID REFERENCES users(id),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  decision_comment TEXT,
  decided_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_approvals_service_request_id_status_idx
  ON service_approvals(service_request_id, status);
CREATE INDEX IF NOT EXISTS service_approvals_approver_id_status_idx
  ON service_approvals(approver_id, status);

CREATE TABLE IF NOT EXISTS request_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  task_number VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assignment_group_id UUID REFERENCES assignment_groups(id),
  assigned_to UUID REFERENCES users(id),
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS request_tasks_service_request_id_idx ON request_tasks(service_request_id);
CREATE INDEX IF NOT EXISTS request_tasks_assignment_group_id_status_idx ON request_tasks(assignment_group_id, status);

INSERT INTO statuses (module, name, description)
VALUES
  ('TICKET', 'AWAITING_APPROVAL', 'Waiting for request approval'),
  ('TICKET', 'REJECTED', 'Rejected by approver')
ON CONFLICT (module, name) DO NOTHING;
