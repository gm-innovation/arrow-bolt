/*
# Operations core

1. New Tables
- `clients` and `vessels` — customer and vessel records.
- `service_orders` — operational work orders linked to company, client, and vessel.
- `service_visits` and `visit_technicians` — scheduling and technician assignment.
- `task_types` and `tasks` — field execution work.
- `task_reports`, `time_entries`, and `service_history` — execution evidence and audit history.

2. Security
- All tables enable RLS, grant access to authenticated users, and scope access to the signed-in user's company where company_id exists.
- Four separate CRUD policies are created for each table.
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL, company_name text, cnpj text, email text, phone text, status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vessels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL, name text NOT NULL, imo_number text, registration_number text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS task_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL, description text, active boolean DEFAULT true, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  order_number text NOT NULL, order_number_num bigint, client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  vessel_id uuid REFERENCES vessels(id) ON DELETE SET NULL, client_reference text, status text DEFAULT 'pending',
  scheduled_date date, omie_created_date timestamptz, auvo_created_date timestamptz, omie_value numeric,
  coordinator_name text, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS service_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE, visit_number integer DEFAULT 1,
  visit_type text, visit_date date, scheduled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, return_reason text, status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS visit_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES service_visits(id) ON DELETE CASCADE, technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  is_lead boolean DEFAULT false, assigned_at timestamptz DEFAULT now(), assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  task_type_id uuid REFERENCES task_types(id) ON DELETE SET NULL, service_order_id uuid REFERENCES service_orders(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES service_visits(id) ON DELETE SET NULL, title text NOT NULL, description text, priority text DEFAULT 'normal',
  status text DEFAULT 'pending', assigned_to uuid REFERENCES technicians(id) ON DELETE SET NULL, completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS task_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE, report_data jsonb DEFAULT '{}'::jsonb, signed_at timestamptz,
  signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL, technician_id uuid REFERENCES technicians(id) ON DELETE SET NULL,
  service_order_id uuid REFERENCES service_orders(id) ON DELETE SET NULL, entry_type text, entry_date date,
  start_time timestamptz, end_time timestamptz, check_in_at timestamptz, check_out_at timestamptz,
  hours_normal numeric DEFAULT 0, hours_extra numeric DEFAULT 0, hours_night numeric DEFAULT 0, hours_standby numeric DEFAULT 0,
  is_travel boolean DEFAULT false, is_overnight boolean DEFAULT false, is_onboard boolean DEFAULT false, is_standby boolean DEFAULT false,
  vessel_name text, coordinator_name text, notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS service_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE, action text NOT NULL, description text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','vessels','task_types','service_orders','service_visits','visit_technicians','tasks','task_reports','time_entries','service_history'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "company_select_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "company_select_%s" ON %I FOR SELECT TO authenticated USING (company_id = get_user_company_id() OR company_id IS NULL)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "company_insert_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "company_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id() OR company_id IS NULL)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "company_update_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "company_update_%s" ON %I FOR UPDATE TO authenticated USING (company_id = get_user_company_id() OR company_id IS NULL) WITH CHECK (company_id = get_user_company_id() OR company_id IS NULL)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "company_delete_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "company_delete_%s" ON %I FOR DELETE TO authenticated USING (company_id = get_user_company_id() OR company_id IS NULL)', t, t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_vessels_client ON vessels(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_status ON service_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_visits_order ON service_visits(service_order_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_time_entries_technician_date ON time_entries(technician_id, entry_date);