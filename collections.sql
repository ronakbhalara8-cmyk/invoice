-- Collections follow-up module
-- Run after schema.sql and payments.sql.

CREATE TABLE IF NOT EXISTS invoice_followups (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  next_followup_date DATE,
  notes TEXT NOT NULL DEFAULT '',
  contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT invoice_followups_status_check
    CHECK (status IN ('PENDING', 'CONTACTED', 'PROMISE_TO_PAY', 'COLLECTED'))
);

CREATE INDEX IF NOT EXISTS idx_invoice_followups_organization_id
  ON invoice_followups (organization_id);

CREATE INDEX IF NOT EXISTS idx_invoice_followups_invoice_id
  ON invoice_followups (invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_followups_next_date
  ON invoice_followups (organization_id, next_followup_date);

DROP TRIGGER IF EXISTS update_invoice_followups_updated_at ON invoice_followups;
CREATE TRIGGER update_invoice_followups_updated_at
  BEFORE UPDATE ON invoice_followups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Backfill a first Pending follow-up for existing unpaid invoices.
INSERT INTO invoice_followups (
  organization_id, invoice_id, customer_id, status, next_followup_date
)
SELECT
  i.organization_id,
  i.id,
  i.customer_id,
  'PENDING',
  COALESCE(i.due_date, i.created_at::date + 15)
FROM invoices i
WHERE COALESCE(i.paid_amount, 0) < i.grand_total
  AND NOT EXISTS (
    SELECT 1
    FROM invoice_followups f
    WHERE f.invoice_id = i.id
      AND f.organization_id = i.organization_id
  );
