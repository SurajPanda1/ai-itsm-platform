INSERT INTO statuses(module,name,description)
VALUES('TICKET','AWAITING_CUSTOMER','Waiting for information or action from the requester')
ON CONFLICT(module,name) DO NOTHING;
