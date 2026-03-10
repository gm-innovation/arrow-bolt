

## Plano: Corrigir visibilidade dos departamentos para Super Admin

### Problema
O usuário super_admin (`e9ebd707-2fdd-4636-b715-78691a1121a8`) não tem registro na tabela `profiles`, então `user_company_id()` retorna `NULL` e a RLS bloqueia todos os departamentos.

### Solução
Duas correções:

**1. Criar perfil para o super_admin (migração)**
```sql
INSERT INTO profiles (id, full_name, company_id)
VALUES ('e9ebd707-2fdd-4636-b715-78691a1121a8', 'Super Administrador', '09a110b9-9f11-4b8d-a691-8b69f5f40a4e')
ON CONFLICT (id) DO NOTHING;
```

**2. Atualizar RLS de `departments` para super_admin ver tudo**
Alterar a policy `dept_select` para que super_admin veja departamentos de todas as empresas:
```sql
DROP POLICY IF EXISTS dept_select ON departments;
CREATE POLICY dept_select ON departments FOR SELECT TO authenticated
USING (
  company_id = user_company_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin')
);
```

Isso garante que mesmo sem `company_id`, o super_admin consegue visualizar todos os departamentos.

