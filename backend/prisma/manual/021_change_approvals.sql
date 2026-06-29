CREATE TABLE IF NOT EXISTS change_approval_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  approval_type varchar(30) NOT NULL,
  approval_group_id uuid REFERENCES assignment_groups(id),
  specific_approver_id uuid REFERENCES users(id),
  required boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_approval_rules_org_active_sequence
  ON change_approval_rules (organization_id, active, sequence);

CREATE TABLE IF NOT EXISTS change_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id uuid NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
  approval_rule_id uuid REFERENCES change_approval_rules(id),
  sequence integer NOT NULL,
  approval_type varchar(30) NOT NULL,
  approver_id uuid REFERENCES users(id),
  status varchar(30) NOT NULL DEFAULT 'PENDING',
  decision_comment text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_approvals_change_status
  ON change_approvals (change_id, status);

CREATE INDEX IF NOT EXISTS idx_change_approvals_approver_status
  ON change_approvals (approver_id, status);
