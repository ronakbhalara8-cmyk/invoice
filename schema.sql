

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  customer_type VARCHAR(50) NOT NULL DEFAULT 'Individual',
  first_name VARCHAR(255) DEFAULT '',
  last_name VARCHAR(255) DEFAULT '',
  company_name VARCHAR(255) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  pan VARCHAR(50) DEFAULT '',
  payment_terms VARCHAR(255) DEFAULT '',
  documents VARCHAR(255) DEFAULT '',
  billing_address JSONB DEFAULT '{}'::jsonb,
  shipping_address JSONB DEFAULT '{}'::jsonb,
  contact_persons JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_organization_id
  ON customers (organization_id);

CREATE INDEX IF NOT EXISTS idx_customers_created_at
  ON customers (created_at DESC);
