## Fechar exposição de PII em `profiles` (revisado)

### Diagnóstico

`public.profiles` mistura diretório interno (id, nome, avatar, e-mail corporativo), dados de RH (cpf, rg, birth_date, hire_date) e PII sensível (telefone pessoal, contato de emergência, gênero, nacionalidade, tipo sanguíneo). A policy de SELECT atual:

```sql
USING (company_id = user_company_id(auth.uid()))
```

deixa qualquer colaborador autenticado ler **tudo** de qualquer colega. Como RLS é por linha e não por coluna, a única correção robusta é separar acesso por sensibilidade.

### Arquitetura em 4 camadas

**Camada 1 — `profiles` (sensível, acesso restrito)**

Apenas:
- self (`id = auth.uid()`)
- `hr`, `admin`, `director`, `super_admin` da mesma empresa

`coordinator` **fica de fora** da leitura completa (princípio do menor privilégio — coordenador é operacional, não opera ficha de RH; quando precisa, usa o diretório/RPC operacional).

**Camada 2 — `profiles_public` (diretório mínimo)**

View **sem `security_invoker`** (ou seja, roda como o owner da view = `postgres`, com o filtro embutido). Aplica o filtro de empresa internamente, expondo só o estritamente necessário para Feed/chat/menções/listas:

```sql
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_barrier = true) AS
SELECT p.id, p.full_name, p.avatar_url, p.company_id
FROM public.profiles p
WHERE p.company_id = public.user_company_id(auth.uid())
   OR public.has_role(auth.uid(), 'super_admin');

REVOKE ALL ON public.profiles_public FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_public TO authenticated;
```

Note: **sem `email`, sem `created_at`, sem `updated_at`** — o diretório usa só `id`, `full_name`, `avatar_url`, `company_id`. Telas que hoje exibem e-mail corporativo de colega passam a não exibir (e-mail próprio continua via `profiles` self).

**Camada 3 — RPCs específicas com retorno explícito**

Sem `RETURNS profiles` e sem `SELECT *` (evita schema drift). Três RPCs separadas:

```sql
-- PII civil/contato (HR/admin/director/self)
CREATE OR REPLACE FUNCTION public.get_employee_pii(_user_id uuid)
RETURNS TABLE (
  id uuid, company_id uuid, full_name text, email text, avatar_url text,
  cpf text, rg text, birth_date date, gender text, nationality text,
  blood_type text, height numeric, phone text,
  emergency_contact_name text, emergency_contact_phone text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _company uuid;
BEGIN
  SELECT p.company_id INTO _company FROM profiles p WHERE p.id = _user_id;
  IF _company IS NULL THEN RETURN; END IF;

  IF NOT (
    _user_id = auth.uid()
    OR has_role(auth.uid(),'super_admin')
    OR (_company = user_company_id(auth.uid())
        AND (has_role(auth.uid(),'hr')
             OR has_role(auth.uid(),'admin')
             OR has_role(auth.uid(),'director')))
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.company_id, p.full_name, p.email, p.avatar_url,
         p.cpf, p.rg, p.birth_date, p.gender, p.nationality,
         p.blood_type, p.height, p.phone,
         p.emergency_contact_name, p.emergency_contact_phone
  FROM profiles p WHERE p.id = _user_id;
END; $$;

REVOKE ALL ON FUNCTION public.get_employee_pii(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_pii(uuid) TO authenticated;

-- HR-only (hire_date e demais campos trabalhistas)
CREATE OR REPLACE FUNCTION public.get_employee_hr_profile(_user_id uuid)
RETURNS TABLE (id uuid, hire_date date, status text /* etc. */)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (
    _user_id = auth.uid()
    OR has_role(auth.uid(),'super_admin')
    OR (EXISTS (SELECT 1 FROM profiles WHERE id = _user_id
                AND company_id = user_company_id(auth.uid()))
        AND (has_role(auth.uid(),'hr')
             OR has_role(auth.uid(),'admin')
             OR has_role(auth.uid(),'director')))
  ) THEN RETURN; END IF;

  RETURN QUERY SELECT p.id, p.hire_date, p.status FROM profiles p WHERE p.id = _user_id;
END; $$;

REVOKE ALL ON FUNCTION public.get_employee_hr_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_hr_profile(uuid) TO authenticated;
```

**Camada 4 — View `employee_celebrations_public` (eventos, sem datas integrais)**

Para Feed/aniversário/tempo de casa — só mês/dia, nunca o ano:

```sql
CREATE OR REPLACE VIEW public.employee_celebrations_public
WITH (security_barrier = true) AS
SELECT
  p.id, p.full_name, p.avatar_url, p.company_id,
  EXTRACT(MONTH FROM p.birth_date)::int AS birth_month,
  EXTRACT(DAY   FROM p.birth_date)::int AS birth_day,
  EXTRACT(MONTH FROM p.hire_date)::int  AS hire_month,
  EXTRACT(DAY   FROM p.hire_date)::int  AS hire_day,
  EXTRACT(YEAR  FROM p.hire_date)::int  AS hire_year  -- aceitável p/ "X anos de casa"
FROM public.profiles p
WHERE p.company_id = public.user_company_id(auth.uid())
   OR public.has_role(auth.uid(), 'super_admin');

REVOKE ALL ON public.employee_celebrations_public FROM PUBLIC, anon;
GRANT SELECT ON public.employee_celebrations_public TO authenticated;
```

### Policies finais em `public.profiles` (SELECT)

Drop **todas** as policies de SELECT existentes e recriar somente:

```sql
-- (drop de todas as policies de SELECT antigas — ver lista no migration)

CREATE POLICY "Self can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Privileged roles can view company profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin')
    OR (company_id = user_company_id(auth.uid())
        AND (has_role(auth.uid(),'hr')
             OR has_role(auth.uid(),'admin')
             OR has_role(auth.uid(),'director')))
  );
```

Validação pós-migration: `SELECT policyname FROM pg_policies WHERE tablename='profiles' AND cmd='SELECT'` deve retornar exatamente essas 2 linhas (regra do "OR" das policies — qualquer sobra reabre tudo).

UPDATE/INSERT/DELETE permanecem como hoje (self, HR, admin, super_admin).

### Mudanças no frontend

**Hooks novos com contratos explícitos** (evita regressão):

- `useMyProfile()` — lê `profiles` (self)
- `useEmployeeDirectory()` — lê `profiles_public` (id/nome/avatar)
- `useEmployeePII(userId)` — RPC `get_employee_pii`
- `useEmployeeHRProfile(userId)` — RPC `get_employee_hr_profile`
- `useEmployeeCelebrations()` — view `employee_celebrations_public`

**Substituições mecânicas** (~50 arquivos):

- `from('profiles').select('id, full_name, avatar_url, ...')` → `from('profiles_public')` em hooks/componentes que só usam diretório
- Joins PostgREST `profiles!fk(id, full_name, avatar_url)` → `profiles_public!fk(...)` (em `useChat`, `useCorpFeed`, `useCorpFeedDiscussions`, `useCorpDocuments`, `useCorpRequests`, `useCorpAuditLog`, `useCorpGroups`, `useCommercialTasks`, `useDepartmentMembers`, `useDepartments`, `useHRTimeEntries`, `useEmployeeNotes`, `useFinance`, `useProductivitySnapshots`, `usePurchaseRequests`, `useQualityActionPlans`, `useQualityAudits`, `useQualityNCRs`, `useGroupDiscussions` etc.)
- Telas onde hoje aparece e-mail de colega não-self: remover a coluna ou migrar para RPC se for tela de RH
- `FeedWorkAnniversaryCard` / aniversários → `useEmployeeCelebrations()`

**Manter `from('profiles')`** apenas em:

- `AuthContext`, páginas `Profile.tsx` por role (self)
- `EmployeeDetailSheet`, `NewEmployeeForm`, `OnboardingDetailDialog` (HR/admin/director — caem nas novas policies)

**Auditar `update().select()` / `insert().select()` em `profiles`**: garantir que o `.select()` pós-mutação só pede colunas que o usuário tem direito de ler (self + HR + admin + director). Caso contrário, remover o `.select()` ou restringir à projeção mínima.

### Helpers (validação prévia)

Confirmar que `user_company_id()` e `has_role()` são `STABLE SECURITY DEFINER`, leem de `profiles`/`user_roles` sem disparar RLS recursiva. Já são (vistos em migrations anteriores), então OK.

### Validação funcional

- HR / Admin / Diretor: leem ficha completa (via `profiles` direto + RPCs)
- Coordenador: **perde** acesso a CPF/telefone/data de nascimento de colegas (passa a usar `profiles_public` + dados operacionais já em outras tabelas, ex.: `technicians`, `service_orders`)
- Técnico/Comercial/Financeiro/Qualidade/Compras: idem — só diretório mínimo
- Self: continua vendo/editando próprio perfil completo
- Feed/chat/menções/listas: funcionam via `profiles_public`
- Aniversários/tempo de casa: funcionam via `employee_celebrations_public` (sem ano de nascimento)
- Scanner do Lovable Cloud reclassifica `profiles_table_public_exposure` como resolvido

### Arquivos editados

1. **Migration SQL** com:
   - DROP das policies de SELECT antigas em `profiles`
   - 2 novas policies de SELECT (self + privileged)
   - View `profiles_public` (sem `security_invoker`, com filtro embutido)
   - View `employee_celebrations_public`
   - RPCs `get_employee_pii` e `get_employee_hr_profile` (retorno explícito, REVOKE/GRANT)
2. **Novos hooks** `useMyProfile`, `useEmployeeDirectory`, `useEmployeePII`, `useEmployeeHRProfile`, `useEmployeeCelebrations`
3. **~50 arquivos** trocando `from('profiles')` / `profiles!fk(...)` para `profiles_public` quando só usam diretório
4. Telas de RH/Onboarding/Profile mantidas em `profiles`/RPCs
5. `mark_as_fixed` no finding `profiles_table_public_exposure`

### Avisos ao usuário pós-implementação

- Coordenadores **perdem** acesso a PII de colegas (intencional — princípio do menor privilégio). Se algum fluxo operacional exigir CPF/telefone do técnico, criar `get_employee_operational_info` específica.
- Telas que hoje mostram e-mail corporativo de colega não-self **deixam de mostrar** o e-mail (passa a aparecer só em telas de RH).
- Aniversários passam a mostrar dia/mês (sem ano).
