INSERT INTO ticket_types(name, description)
VALUES ('CHANGE', 'Change request')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES users(id),
  change_type varchar(30) NOT NULL DEFAULT 'STANDARD',
  risk varchar(20) NOT NULL DEFAULT 'LOW',
  impact varchar(20) NOT NULL DEFAULT 'LOW',
  planned_start timestamptz,
  planned_end timestamptz,
  implementation_plan text,
  backout_plan text,
  test_plan text,
  actual_start timestamptz,
  actual_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE changes ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES users(id);
ALTER TABLE changes ADD COLUMN IF NOT EXISTS change_type varchar(30) NOT NULL DEFAULT 'STANDARD';
ALTER TABLE changes ADD COLUMN IF NOT EXISTS risk varchar(20) NOT NULL DEFAULT 'LOW';
ALTER TABLE changes ADD COLUMN IF NOT EXISTS impact varchar(20) NOT NULL DEFAULT 'LOW';
ALTER TABLE changes ADD COLUMN IF NOT EXISTS planned_start timestamptz;
ALTER TABLE changes ADD COLUMN IF NOT EXISTS planned_end timestamptz;
ALTER TABLE changes ADD COLUMN IF NOT EXISTS implementation_plan text;
ALTER TABLE changes ADD COLUMN IF NOT EXISTS backout_plan text;
ALTER TABLE changes ADD COLUMN IF NOT EXISTS test_plan text;
ALTER TABLE changes ADD COLUMN IF NOT EXISTS actual_start timestamptz;
ALTER TABLE changes ADD COLUMN IF NOT EXISTS actual_end timestamptz;

CREATE INDEX IF NOT EXISTS idx_changes_requested_by ON changes(requested_by);
