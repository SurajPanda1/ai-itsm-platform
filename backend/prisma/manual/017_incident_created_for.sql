ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS created_for uuid;

UPDATE incidents i
SET created_for = t.created_by
FROM tickets t
WHERE i.ticket_id = t.id
  AND i.created_for IS NULL;

ALTER TABLE incidents
  ALTER COLUMN created_for SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incidents_created_for_fkey'
  ) THEN
    ALTER TABLE incidents
      ADD CONSTRAINT incidents_created_for_fkey
      FOREIGN KEY (created_for) REFERENCES users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS incidents_created_for_idx
  ON incidents(created_for);
