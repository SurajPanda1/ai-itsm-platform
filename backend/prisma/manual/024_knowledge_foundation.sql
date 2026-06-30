CREATE TABLE IF NOT EXISTS knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS article_number VARCHAR(20);
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS category VARCHAR(80);
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS status VARCHAR(30);
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS keywords TEXT;
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

UPDATE knowledge_articles
SET article_number = 'KB' || LPAD(row_number::text, 6, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS row_number
  FROM knowledge_articles
  WHERE article_number IS NULL
) numbered
WHERE knowledge_articles.id = numbered.id;

UPDATE knowledge_articles SET category = 'General' WHERE category IS NULL;
UPDATE knowledge_articles SET status = 'DRAFT' WHERE status IS NULL;
UPDATE knowledge_articles SET published_at = COALESCE(published_at, updated_at) WHERE status = 'PUBLISHED';

ALTER TABLE knowledge_articles ALTER COLUMN article_number SET NOT NULL;
ALTER TABLE knowledge_articles ALTER COLUMN category SET NOT NULL;
ALTER TABLE knowledge_articles ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_articles_article_number_key'
  ) THEN
    ALTER TABLE knowledge_articles ADD CONSTRAINT knowledge_articles_article_number_key UNIQUE(article_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_org_status ON knowledge_articles(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_org_category ON knowledge_articles(organization_id, category);

CREATE TABLE IF NOT EXISTS ticket_knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  knowledge_article_id UUID NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
  linked_by UUID NOT NULL REFERENCES users(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ticket_knowledge_article UNIQUE(ticket_id, knowledge_article_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_knowledge_org_ticket ON ticket_knowledge_articles(organization_id, ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_knowledge_article ON ticket_knowledge_articles(knowledge_article_id);
