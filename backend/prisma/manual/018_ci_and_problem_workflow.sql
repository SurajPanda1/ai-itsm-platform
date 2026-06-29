INSERT INTO statuses(module, name, description)
VALUES
  ('TICKET', 'ASSESS', 'Problem assessment'),
  ('TICKET', 'ROOT_CAUSE_ANALYSIS', 'Root cause analysis'),
  ('TICKET', 'FIX', 'Problem fix in progress')
ON CONFLICT (module, name) DO NOTHING;

UPDATE tickets
SET status_id = (SELECT id FROM statuses WHERE module = 'TICKET' AND name = 'ASSESS')
WHERE ticket_type_id = (SELECT id FROM ticket_types WHERE name = 'PROBLEM')
  AND status_id IN (SELECT id FROM statuses WHERE module = 'TICKET' AND name IN ('IN_PROGRESS', 'AWAITING_CUSTOMER'));
