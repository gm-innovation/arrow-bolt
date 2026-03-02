

## Problema: Destinatários não aparecem no select

### Causa raiz
A tabela `profiles` possui políticas RLS restritivas. O usuário logado tem role `commercial`, e as políticas de SELECT em `profiles` só permitem:
- Ver o próprio perfil
- Admins, HR e Managers veem todos da empresa
- Técnicos veem colegas de OS

Resultado: o join `profiles!department_members_user_id_fkey` retorna `null` para todos os membros, e o filtro `m.profile &&` descarta todos.

### Solução

1. **Migração SQL** — Adicionar uma política RLS em `profiles` que permita qualquer usuário autenticado da mesma empresa visualizar `id`, `full_name` e `email` de outros perfis. Alternativamente, criar uma política mais específica:
   ```sql
   CREATE POLICY "Users can view profiles in their company"
   ON profiles FOR SELECT TO authenticated
   USING (company_id = user_company_id(auth.uid()));
   ```
   Isso é seguro pois só expõe perfis da mesma empresa, e as outras roles (admin, hr, manager) já têm essa mesma permissão — a nova política apenas estende para todos os roles.

2. **Limpeza** — As políticas redundantes existentes (admin, hr, manager que fazem `company_id = user_company_id(auth.uid())`) podem ser removidas, pois a nova política as cobre. Mas para segurança, mantê-las não causa problema — RLS é PERMISSIVE (OR).

### Resultado esperado
Ao selecionar um departamento no modal, os membros aparecerão corretamente no select de destinatário, pois o join com `profiles` retornará os dados.

