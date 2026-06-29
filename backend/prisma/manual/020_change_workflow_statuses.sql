INSERT INTO statuses(module, name, description)
VALUES
  ('TICKET', 'NEW', 'New change'),
  ('TICKET', 'PLAN', 'Change planning'),
  ('TICKET', 'APPROVAL', 'Change approval'),
  ('TICKET', 'CAB', 'CAB review'),
  ('TICKET', 'SCHEDULED', 'Change scheduled'),
  ('TICKET', 'IMPLEMENT', 'Change implementation'),
  ('TICKET', 'VALIDATE', 'Change validation')
ON CONFLICT (module, name) DO NOTHING;

UPDATE tickets
SET status_id = (SELECT id FROM statuses WHERE module = 'TICKET' AND name = 'NEW')
WHERE ticket_type_id = (SELECT id FROM ticket_types WHERE name = 'CHANGE')
  AND status_id = (SELECT id FROM statuses WHERE module = 'TICKET' AND name = 'OPEN');

UPDATE tickets
SET status_id = (SELECT id FROM statuses WHERE module = 'TICKET' AND name = 'IMPLEMENT')
WHERE ticket_type_id = (SELECT id FROM ticket_types WHERE name = 'CHANGE')
  AND status_id = (SELECT id FROM statuses WHERE module = 'TICKET' AND name = 'IN_PROGRESS');

UPDATE tickets
SET status_id = (SELECT id FROM statuses WHERE module = 'TICKET' AND name = 'VALIDATE')
WHERE ticket_type_id = (SELECT id FROM ticket_types WHERE name = 'CHANGE')
  AND status_id IN (
    SELECT id FROM statuses WHERE module = 'TICKET' AND name IN ('AWAITING_CUSTOMER', 'RESOLVED')
  );
