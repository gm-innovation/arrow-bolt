## Objetivo

Usar o **mesmo modal de Medição Final** dos coordenadores (`MeasurementDialog` com abas Básico/Mão de Obra/Materiais/Serviços/Deslocamento/Despesas) também em `/commercial/measurements`, respeitando a regra: **cada usuário só edita o que é dele**; exceções: `super_admin` e `director` (e mantemos `coordinator/admin` como já hoje).

## Mudanças

### 1. Frontend — `src/pages/commercial/Measurements.tsx`
- Substituir `MeasurementDetailDialog` por `MeasurementDialog` (mesmo componente de `admin/ServiceOrders.tsx`), abrindo em `<Dialog open onOpenChange>`.
- Ajustar o `select` da query para incluir `service_orders(id, order_number, created_by, clients(name))` e passar `serviceOrderId={m.service_orders.id}`.
- Calcular `canEdit` no cliente (apenas para UX — habilitar/desabilitar botões): `super_admin || director || coordinator || admin || (role in [commercial, marketing] && service_order.created_by === profile.id)`. A segurança real fica na RLS.

### 2. `MeasurementForm` — modo leitura
- Adicionar prop `readOnly?: boolean` propagada por `MeasurementDialog`.
- Quando `true`: desabilitar inputs/botões de salvar/adicionar/remover em todas as abas. Layout idêntico ao print.

### 3. RLS — permitir edição do "dono" para Comercial/Marketing
Regra: usuário com role `commercial` ou `marketing` pode `INSERT/UPDATE/DELETE` em `measurements` e sub-tabelas **somente** quando a OS pai foi criada por ele (`service_orders.created_by = auth.uid()`). `super_admin`, `director`, `coordinator`, `admin` mantêm acesso amplo já existente.

- Criar função SECURITY DEFINER `public.can_edit_measurement(_measurement_id uuid)` que retorna `true` se:
  - `has_role(auth.uid(), 'super_admin' | 'director' | 'coordinator' | 'admin')`, **ou**
  - `has_role(auth.uid(), 'commercial' | 'marketing')` **e** `service_orders.created_by = auth.uid()` para a OS da medição.
- Aplicar em novas policies de `UPDATE/INSERT/DELETE` nas tabelas: `measurements`, `measurement_materials`, `measurement_services`, `measurement_man_hours`, `measurement_travels`, `measurement_expenses` (usando `measurement_id` para as sub-tabelas).
- Manter SELECT como está (já visível para esses papéis).

### 4. Limpeza
- Remover `MeasurementDetailDialog` se `rg` confirmar que nada mais o usa.

## Fora de escopo
- Alterar cálculos de medição, categoria fiscal ou fluxo do coordenador.
- Mudanças em outros módulos.

## Confirmações rápidas
1. "Dono" = quem criou a OS (`service_orders.created_by`). Ok?
2. `commercial`/`marketing` podem **criar** medição para uma OS própria também (não só editar existente)? Assumo que sim.