BEGIN;
UPDATE tickets
SET ticket_type_id = (SELECT id FROM ticket_types WHERE name = 'SERVICE_REQUEST')
WHERE ticket_type_id = (SELECT id FROM ticket_types WHERE name = 'REQUEST');

DELETE FROM ticket_types WHERE name = 'REQUEST';
COMMIT;
