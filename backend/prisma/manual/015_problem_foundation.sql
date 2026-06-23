CREATE TABLE IF NOT EXISTS problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  root_cause text,
  workaround text,
  permanent_fix text,
  known_error boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS problem_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  task_number varchar(20) NOT NULL UNIQUE,
  title varchar(200) NOT NULL,
  description text,
  assignment_group_id uuid REFERENCES assignment_groups(id),
  assigned_to uuid REFERENCES users(id),
  status varchar(30) NOT NULL DEFAULT 'OPEN',
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS problem_tasks_problem_id_idx ON problem_tasks(problem_id);
CREATE INDEX IF NOT EXISTS problem_tasks_assignment_group_status_idx ON problem_tasks(assignment_group_id, status);

INSERT INTO ticket_types (name, description)
VALUES ('PROBLEM', 'Problem investigation and root cause management')
ON CONFLICT (name) DO NOTHING;
