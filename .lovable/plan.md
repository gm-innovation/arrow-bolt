

## Problema

A política de INSERT para coordenadores **existe e está correta**. O problema é que o código faz `.insert(...).select().single()` — e o `.select()` requer uma política de **SELECT** na tabela `service_orders`.

Coordenadores **não têm política SELECT** em `service_orders`. As políticas SELECT atuais cobrem apenas:
- `admin` ("Admins can view company service orders")
- `super_admin` (ALL)
- `manager` ("Managers can view all company service orders")
- `hr` ("HR can view company service orders")
- Técnicos atribuídos ("Technicians can view their assigned service orders")

Coordenadores ficam de fora, causando o 403.

## Correção

Criar uma política SELECT para coordenadores e diretores na tabela `service_orders`:

```sql
CREATE POLICY "Coordinators and directors can view company service orders"
ON public.service_orders
FOR SELECT
TO authenticated
USING (
  company_id = user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'coordinator'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
  )
);
```

Isso resolve tanto o `.select()` pós-insert quanto a listagem de OS na dashboard do coordenador.

