CREATE TABLE IF NOT EXISTS ticket_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parent_ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  related_ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE, relationship_type varchar(30) NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id), created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ticket_relationships_distinct CHECK (parent_ticket_id <> related_ticket_id),
  CONSTRAINT ticket_relationships_unique UNIQUE (parent_ticket_id, related_ticket_id, relationship_type),
  CONSTRAINT ticket_relationships_type CHECK (relationship_type IN ('CHILD_INCIDENT', 'RELATED_CHANGE', 'RELATED_PROBLEM'))
);
CREATE INDEX IF NOT EXISTS idx_ticket_relationships_parent ON ticket_relationships(parent_ticket_id);
