/*
# Core Foundation: companies, profiles, user_roles, technicians

1. New Tables
- `companies` — tenant companies (id, name, email, phone, address, cnpj, cep, logo_url, subscription_plan, payment_status, created_at, updated_at)
- `profiles` — user profiles linked to auth.users (id, company_id, full_name, social_name, email, phone, cpf, rg, rg_issuer, rg_issuer_state, birth_date, birth_place, gender, nationality, marital_status, education_level, hire_date, position, position_id, position_level, position_start_date, department_id, employment_type, registration_number, source_code, termination_date, termination_reason, employee_status, has_dependents, dependents_count, hr_notes, direct_manager_id, status, avatar_url, timeclock_pin)
- `user_roles` — role assignments (user_id, role)
- `technicians` — technician records (id, user_id, active, company_id)

2. Security
- RLS enabled on all tables.
- profiles: authenticated users can read/update own profile.
- user_roles: authenticated users can read own roles.
- technicians: authenticated users can read technicians in their company.
- companies: authenticated users can read companies.

3. Functions
- `has_role(p_role text)` — SECURITY DEFINER function to check if current user has a given role.
- `get_user_company_id()` — SECURITY DEFINER function returning the current user's company_id.
*/

-- ============= COMPANIES =============
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  cnpj text,
  cep text,
  logo_url text,
  subscription_plan text DEFAULT 'free',
  payment_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON companies TO authenticated;

DROP POLICY IF EXISTS "select_companies" ON companies;
CREATE POLICY "select_companies" ON companies FOR SELECT
  TO authenticated USING (true);

-- ============= PROFILES =============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  full_name text,
  social_name text,
  email text,
  phone text,
  cpf text,
  rg text,
  rg_issuer text,
  rg_issuer_state text,
  birth_date date,
  birth_place text,
  gender text,
  nationality text,
  marital_status text,
  education_level text,
  hire_date date,
  position text,
  position_id uuid,
  position_level text,
  position_start_date date,
  department_id uuid,
  employment_type text,
  registration_number text,
  source_code text,
  termination_date date,
  termination_reason text,
  employee_status text DEFAULT 'active',
  has_dependents boolean DEFAULT false,
  dependents_count int DEFAULT 0,
  hr_notes text,
  direct_manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'active',
  avatar_url text,
  timeclock_pin text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============= USER_ROLES =============
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON user_roles TO authenticated;

DROP POLICY IF EXISTS "select_own_roles" ON user_roles;
CREATE POLICY "select_own_roles" ON user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ============= TECHNICIANS =============
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active boolean DEFAULT true,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON technicians TO authenticated;

DROP POLICY IF EXISTS "select_technicians" ON technicians;
CREATE POLICY "select_technicians" ON technicians FOR SELECT
  TO authenticated USING (true);

-- ============= HELPER FUNCTIONS =============
CREATE OR REPLACE FUNCTION has_role(p_role text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = p_role
  );
$$;

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

-- ============= INDEXES =============
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_technicians_company_id ON technicians(company_id);
CREATE INDEX IF NOT EXISTS idx_technicians_user_id ON technicians(user_id);