
-- 1. Add payment lifecycle fields to existing invoices.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT (CURRENT_DATE + 15),
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID';

-- Existing invoices start as unpaid. Their due date defaults to 15 days after migration.
UPDATE invoices
SET due_date = COALESCE(due_date, created_at::date + 15),
    paid_amount = COALESCE(paid_amount, 0),
    payment_status = CASE
      WHEN COALESCE(payment_status, '') = '' THEN 'UNPAID'
      ELSE payment_status
    END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_payment_status_check'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_payment_status_check
      CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_payment_status
  ON invoices (organization_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON invoices (organization_id, due_date);

-- 2. Store every payment as an auditable ledger entry.
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  payment_number VARCHAR(100) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'OTHER',
  reference_number VARCHAR(255) DEFAULT '',
  notes TEXT DEFAULT '',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_method_check
    CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'OTHER')),
  CONSTRAINT payments_status_check
    CHECK (payment_status IN ('ACTIVE', 'VOID')),
  CONSTRAINT payments_organization_number_unique
    UNIQUE (organization_id, payment_number)
);

CREATE INDEX IF NOT EXISTS idx_payments_organization_id
  ON payments (organization_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
  ON payments (invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_customer_id
  ON payments (customer_id);

CREATE INDEX IF NOT EXISTS idx_payments_payment_date
  ON payments (organization_id, payment_date DESC);

-- Prevent a payment from being recorded against another organization’s invoice
-- and prevent active payments from exceeding the invoice total.
CREATE OR REPLACE FUNCTION validate_payment()
RETURNS TRIGGER AS $$
DECLARE
  invoice_organization_id INTEGER;
  invoice_total NUMERIC(12,2);
  active_payment_total NUMERIC(12,2);
BEGIN
  IF NEW.payment_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Payment date cannot be in the future';
  END IF;

  SELECT organization_id, grand_total
  INTO invoice_organization_id, invoice_total
  FROM invoices
  WHERE id = NEW.invoice_id
  FOR UPDATE;

  IF invoice_organization_id IS NULL THEN
    RAISE EXCEPTION 'Invoice does not exist';
  END IF;

  IF invoice_organization_id <> NEW.organization_id THEN
    RAISE EXCEPTION 'Payment organization does not match invoice organization';
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO active_payment_total
  FROM payments
  WHERE invoice_id = NEW.invoice_id
    AND payment_status = 'ACTIVE'
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

  IF NEW.payment_status = 'ACTIVE' AND active_payment_total + NEW.amount > invoice_total THEN
    RAISE EXCEPTION 'Payment amount exceeds the invoice balance';
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_payment_before_write ON payments;
CREATE TRIGGER validate_payment_before_write
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment();

-- Recorded payments are immutable. Corrections must be handled outside this ledger.
CREATE OR REPLACE FUNCTION prevent_payment_void()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.payment_status = 'ACTIVE' AND NEW.payment_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Recorded payments cannot be voided or changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_payment_void_before_update ON payments;
CREATE TRIGGER prevent_payment_void_before_update
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_payment_void();

-- Keep invoice paid_amount and payment_status synchronized after every ledger change.
CREATE OR REPLACE FUNCTION refresh_invoice_payment_summary()
RETURNS TRIGGER AS $$
DECLARE
  affected_invoice_id INTEGER;
BEGIN
  affected_invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  UPDATE invoices AS i
  SET paid_amount = totals.paid_amount,
      payment_status = CASE
        WHEN i.payment_status = 'VOID' THEN 'VOID'
        WHEN totals.paid_amount >= i.grand_total THEN 'PAID'
        WHEN totals.paid_amount > 0 THEN 'PARTIALLY_PAID'
        WHEN i.due_date < CURRENT_DATE THEN 'OVERDUE'
        ELSE 'UNPAID'
      END,
      updated_at = NOW()
  FROM (
    SELECT COALESCE(SUM(amount) FILTER (WHERE payment_status = 'ACTIVE'), 0)::NUMERIC(12,2) AS paid_amount
    FROM payments
    WHERE invoice_id = affected_invoice_id
  ) AS totals
  WHERE i.id = affected_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_invoice_payment_summary_after_write ON payments;
CREATE TRIGGER refresh_invoice_payment_summary_after_write
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION refresh_invoice_payment_summary();

-- Keep updated_at current for payment edits.
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Receivables read models for API/report screens.
CREATE OR REPLACE VIEW invoice_receivables AS
SELECT
  i.id AS invoice_id,
  i.organization_id,
  i.invoice_number,
  i.customer_name,
  i.grand_total,
  i.paid_amount,
  GREATEST(i.grand_total - i.paid_amount, 0)::NUMERIC(12,2) AS balance_due,
  i.due_date,
  CASE
    WHEN i.payment_status = 'VOID' THEN 'VOID'
    WHEN i.paid_amount >= i.grand_total THEN 'PAID'
    WHEN i.paid_amount > 0 THEN 'PARTIALLY_PAID'
    WHEN i.due_date < CURRENT_DATE THEN 'OVERDUE'
    ELSE 'UNPAID'
  END AS payment_status,
  i.created_at
FROM invoices i;

CREATE OR REPLACE VIEW customer_receivables AS
SELECT
  organization_id,
  customer_name,
  COUNT(*) FILTER (WHERE payment_status <> 'VOID') AS invoice_count,
  COALESCE(SUM(grand_total) FILTER (WHERE payment_status <> 'VOID'), 0)::NUMERIC(12,2) AS invoiced_amount,
  COALESCE(SUM(paid_amount) FILTER (WHERE payment_status <> 'VOID'), 0)::NUMERIC(12,2) AS paid_amount,
  COALESCE(SUM(balance_due) FILTER (WHERE payment_status <> 'VOID'), 0)::NUMERIC(12,2) AS balance_due,
  COUNT(*) FILTER (WHERE payment_status = 'OVERDUE') AS overdue_invoice_count
FROM invoice_receivables
GROUP BY organization_id, customer_name;
