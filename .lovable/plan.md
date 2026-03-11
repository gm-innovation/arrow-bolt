

## Problema

O erro `new row violates row-level security policy for table "service_orders"` ocorre porque o usuário logado (`engenharia@googlemarine.com.br`) tem role `coordinator`, e as políticas RLS de INSERT na tabela `service_orders` só permitem:

1. `super_admin` (política ALL)
2. `admin` com `created_by = auth.uid()` (política ALL)

Não existe política de INSERT para `coordinator`, `director` ou outros papéis operacionais.

## Correção

Criar uma nova política RLS de INSERT na tabela `service_orders` para permitir que coordenadores e diretores criem ordens de serviço na sua empresa:

```sql
CREATE POLICY "Coordinators and directors can create service orders"
ON public.service_orders
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = user_company_id(auth.uid())
  AND created_by = auth.uid()
  AND (
    has_role(auth.uid(), 'coordinator'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
  )
);
```

Também adicionar política de UPDATE para coordenadores nas OS que eles criaram:

```sql
CREATE POLICY "Coordinators can update their own service orders"
ON public.service_orders
FOR UPDATE
TO authenticated
USING (
  company_id = user_company_id(auth.uid())
  AND created_by = auth.uid()
  AND has_role(auth.uid(), 'coordinator'::app_role)
)
WITH CHECK (
  company_id = user_company_id(auth.uid())
  AND created_by = auth.uid()
  AND has_role(auth.uid(), 'coordinator'::app_role)
);
```

### Resultado esperado
- Coordenadores e diretores poderão criar OS na sua empresa
- A restrição `created_by = auth.uid()` garante que só criam OS em nome próprio
- A restrição `company_id = user_company_id()` garante isolamento por empresa

