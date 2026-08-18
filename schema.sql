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
  currency VARCHAR(50) DEFAULT 'INR',
  payment_terms VARCHAR(255) DEFAULT '',
  billing_address JSONB DEFAULT '{}'::jsonb,
  shipping_address JSONB DEFAULT '{}'::jsonb,
  contact_persons JSONB DEFAULT '[]'::jsonb,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE customers
  ALTER COLUMN billing_address TYPE JSONB USING billing_address::jsonb,
  ALTER COLUMN shipping_address TYPE JSONB USING shipping_address::jsonb;

CREATE INDEX IF NOT EXISTS idx_customers_organization_id
  ON customers (organization_id);

CREATE INDEX IF NOT EXISTS idx_customers_created_at
  ON customers (created_at DESC);

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


CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  country VARCHAR(100) NOT NULL,
  country_code VARCHAR(20) NOT NULL,
  state VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  country TEXT,
  state TEXT,
  country_name TEXT,
  state_name TEXT,
  currency TEXT,
  language TEXT,
  timezone TEXT,
  gst_registered BOOLEAN DEFAULT FALSE,
  gst_number TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


-- Create items table
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX idx_items_organization_id ON items(organization_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_created_at ON items(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_items_updated_at 
    BEFORE UPDATE ON items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
