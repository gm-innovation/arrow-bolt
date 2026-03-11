

## Problema

A OS é criada com sucesso, mas dois passos seguintes falham por falta de políticas RLS para `coordinator`:

1. **`service_visits` SELECT** — O código busca a visita inicial criada pelo trigger (`create_initial_visit`), mas coordenadores não têm política SELECT nessa tabela. Resultado: erro PGRST116 (0 rows).

2. **`visit_technicians` INSERT** — Mesmo que o SELECT funcionasse, a inserção dos técnicos na visita falharia porque só `admin` tem política de INSERT/ALL em `visit_technicians`.

## Correção

Criar duas novas políticas RLS:

```sql
-- 1. Coordenadores e diretores podem ver visitas da sua empresa
CREATE POLICY "Coordinators and directors can view company visits"
ON public.service_visits
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'director'::app_role))
  AND EXISTS (
    SELECT 1 FROM service_orders so
    WHERE so.id = service_visits.service_order_id
      AND so.company_id = user_company_id(auth.uid())
  )
);

-- 2. Coordenadores e diretores podem atribuir técnicos a visitas da sua empresa
CREATE POLICY "Coordinators and directors can manage visit technicians"
ON public.visit_technicians
FOR ALL
TO authenticated
USING (
  (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'director'::app_role))
  AND EXISTS (
    SELECT 1 FROM service_visits sv
    JOIN service_orders so ON sv.service_order_id = so.id
    WHERE sv.id = visit_technicians.visit_id
      AND so.company_id = user_company_id(auth.uid())
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'director'::app_role))
  AND EXISTS (
    SELECT 1 FROM service_visits sv
    JOIN service_orders so ON sv.service_order_id = so.id
    WHERE sv.id = visit_technicians.visit_id
      AND so.company_id = user_company_id(auth.uid())
  )
);
```

Além disso, trocar `.single()` por `.maybeSingle()` na linha 704 do `NewOrderForm.tsx` para evitar o erro 406 caso a visita demore a ser criada pelo trigger.

### Arquivos a alterar
- Migration SQL (nova)
- `src/components/admin/orders/NewOrderForm.tsx` — linha 704: `.single()` → `.maybeSingle()`

### Resultado esperado
- Coordenadores conseguem criar OS completa com técnicos atribuídos
- Sem erros 403/406

