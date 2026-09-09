/*
# Finance and Supplies

1. New Tables
- finance_payables, finance_receivables, finance_reimbursements, finance_settings.
- purchase_requests, purchase_request_items.
- system_settings (key-value config store).

2. Security
- RLS enabled and four company-scoped CRUD policies on all tables.
*/
CREATE TABLE IF NOT EXISTS finance_payables (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE, description text NOT NULL, amount numeric DEFAULT 0, due_date date, status text DEFAULT 'pending', category text, supplier text, invoice_number text, paid_at timestamptz, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS finance_receivables (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE, description text NOT NULL, amount numeric DEFAULT 0, due_date date, status text DEFAULT 'pending', category text, client_id uuid REFERENCES clients(id) ON DELETE SET NULL, invoice_number text, received_at timestamptz, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS finance_reimbursements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE, employee_id uuid REFERENCES profiles(id) ON DELETE SET NULL, description text NOT NULL, amount numeric DEFAULT 0, status text DEFAULT 'pending', category text, approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, approved_at timestamptz, paid_at timestamptz, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS finance_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid UNIQUE REFERENCES companies(id) ON DELETE CASCADE, default_payment_terms text, tax_rate numeric DEFAULT 0, currency text DEFAULT 'BRL', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS purchase_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE, title text NOT NULL, description text, status text DEFAULT 'draft', total_value numeric DEFAULT 0, requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, department text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS purchase_request_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE, request_id uuid NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE, name text NOT NULL, quantity numeric DEFAULT 1, unit text, unit_value numeric DEFAULT 0, total_value numeric DEFAULT 0, notes text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS system_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE, key text NOT NULL, value text, description text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), UNIQUE(company_id, key));
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['finance_payables','finance_receivables','finance_reimbursements','finance_settings','purchase_requests','purchase_request_items','system_settings'] LOOP
EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated',t);
EXECUTE format('DROP POLICY IF EXISTS "select_%s" ON %I',t,t); EXECUTE format('CREATE POLICY "select_%s" ON %I FOR SELECT TO authenticated USING (company_id = get_user_company_id() OR company_id IS NULL)',t,t);
EXECUTE format('DROP POLICY IF EXISTS "insert_%s" ON %I',t,t); EXECUTE format('CREATE POLICY "insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id() OR company_id IS NULL)',t,t);
EXECUTE format('DROP POLICY IF EXISTS "update_%s" ON %I',t,t); EXECUTE format('CREATE POLICY "update_%s" ON %I FOR UPDATE TO authenticated USING (company_id = get_user_company_id() OR company_id IS NULL) WITH CHECK (company_id = get_user_company_id() OR company_id IS NULL)',t,t);
EXECUTE format('DROP POLICY IF EXISTS "delete_%s" ON %I',t,t); EXECUTE format('CREATE POLICY "delete_%s" ON %I FOR DELETE TO authenticated USING (company_id = get_user_company_id() OR company_id IS NULL)',t,t);
END LOOP; END $$;
CREATE INDEX IF NOT EXISTS idx_payables_company ON finance_payables(company_id);
CREATE INDEX IF NOT EXISTS idx_receivables_company ON finance_receivables(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_req_company ON purchase_requests(company_id);