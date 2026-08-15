-- PostgreSQL invoice schema

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  invoice_number VARCHAR(100) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  company_info JSONB DEFAULT '{}'::jsonb,
  billing_to JSONB DEFAULT '{}'::jsonb,
  shipping_to JSONB DEFAULT '{}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id
  ON invoices (organization_id);

CREATE INDEX IF NOT EXISTS idx_invoices_created_at
  ON invoices (created_at DESC);
