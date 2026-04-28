## Problema

`new row violates row-level security policy for table "vessels"` ao adicionar embarcação.

## Causa raiz

A única policy de escrita em `vessels` é `FOR ALL` exigindo `has_role('admin')`. No projeto **ninguém tem role `admin`** — os roles operacionais reais são `coordinator`, `director`, `commercial`, `hr`, `super_admin`. A memória já registra: *"`coordinator` é operational admin (not `admin`)"* e *"`director` replaces `manager`"*. Por isso INSERT/UPDATE/DELETE em `vessels` sempre falha.

A policy SELECT `Managers can view all company vessels` (que usa `has_role('manager')`) também é morta, mas inofensiva — outra policy SELECT (`Users can view vessels in their company`) já cobre leitura corretamente via `clients.company_id`.

## Pontos do feedback validados

- **SELECT via `clients.company_id`**: já é assim hoje (`vessels` não tem `company_id` direto). ✅
- **`commercial` escopo**: tabela `clients` não possui `owner_id`/`responsible_user_id`. Não há como restringir por "cliente do comercial" — mantém escopo por empresa. ✅
- **Super admin global**: no projeto super_admin opera dentro da própria empresa via `profiles.company_id` (padrão consolidado). Sem mudança de escopo. ✅
- **Índice `(id, company_id)` em clients**: `id` já é PK; o lookup do EXISTS é O(log n) por PK + heap fetch para checar company_id. Não traz ganho real, **dispensado**.
- **Helper `is_operational_role`**: bom para consistência futura — incluído.
- **Soft delete**: fora do escopo desta correção (mudança de domínio, não de RLS). FKs de `service_orders.vessel_id` impedem hard delete acidental quando há histórico (erro de FK, não silencioso).

## Migration

```sql
-- 1. Helper para roles operacionais (reutilizável em outras tabelas)
CREATE OR REPLACE FUNCTION public.is_operational_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'coordinator'::app_role) OR
    public.has_role(_user_id, 'director'::app_role)    OR
    public.has_role(_user_id, 'commercial'::app_role)  OR
    public.has_role(_user_id, 'super_admin'::app_role)
$$;

-- 2. Limpar policies legadas com roles inexistentes
DROP POLICY IF EXISTS "Admins can manage vessels in their company" ON public.vessels;
DROP POLICY IF EXISTS "Managers can view all company vessels"      ON public.vessels;

-- 3. INSERT
CREATE POLICY "Operational roles can insert vessels"
ON public.vessels FOR INSERT TO authenticated
WITH CHECK (
  public.is_operational_role(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = vessels.client_id
      AND c.company_id = public.user_company_id(auth.uid())
  )
);

-- 4. UPDATE (USING e WITH CHECK simétricos para impedir mover entre empresas)
CREATE POLICY "Operational roles can update vessels"
ON public.vessels FOR UPDATE TO authenticated
USING (
  public.is_operational_role(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = vessels.client_id
      AND c.company_id = public.user_company_id(auth.uid())
  )
)
WITH CHECK (
  public.is_operational_role(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = vessels.client_id
      AND c.company_id = public.user_company_id(auth.uid())
  )
);

-- 5. DELETE (sem commercial)
CREATE POLICY "Privileged roles can delete vessels"
ON public.vessels FOR DELETE TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'coordinator'::app_role) OR
    public.has_role(auth.uid(), 'director'::app_role)    OR
    public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = vessels.client_id
      AND c.company_id = public.user_company_id(auth.uid())
  )
);
```

A SELECT existente (`Users can view vessels in their company`) já está correta e fica intacta.

## Resultado

- Cadastro de embarcação volta a funcionar para coordenadores, diretores, comerciais e super_admin da empresa.
- Exclusão restrita a coordenadores, diretores e super_admin.
- Isolamento por empresa garantido em todas as operações via `clients.company_id`.
- UPDATE simétrico impede mover embarcação para cliente de outra empresa.
- Helper `is_operational_role` disponível para padronizar futuras policies.
- Sem mudanças de frontend.
