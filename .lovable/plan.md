

## Plano: Corrigir visibilidade de clientes para o Coordenador

### Problema
Os clientes existem no banco de dados (454 clientes sincronizados do Omie), mas o coordenador não consegue vê-los porque as políticas de segurança (RLS) da tabela `clients` não incluem a role `coordinator`.

Políticas atuais de SELECT:
- `admin` + `super_admin` + supervisores (via service_orders) — OK
- `commercial` — OK
- `manager` — OK
- `technician` (via tasks) — OK
- **`coordinator` — AUSENTE**

### Solução
Criar uma nova política RLS que permita ao coordenador visualizar e gerenciar os clientes da sua empresa:

```sql
CREATE POLICY "Coordinators can manage clients in their company"
  ON public.clients FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'coordinator'::app_role)
    AND company_id = user_company_id(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'coordinator'::app_role)
    AND company_id = user_company_id(auth.uid())
  );
```

### Impacto
- Uma migração SQL apenas, sem alterações em código
- Os 454 clientes sincronizados do Omie e os previamente cadastrados voltarão a aparecer imediatamente para o coordenador
- O coordenador também poderá criar/editar/excluir clientes na sua empresa

