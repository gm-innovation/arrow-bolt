# Plano: Enriquecer espelho Omie e corrigir lentidão nas telas de OS

## Diagnóstico (confirmado no banco e no código)

- O espelho `omie-sync` grava apenas número, cliente, status e data prevista. **4.581 de 4.582 OSs espelhadas** estão sem embarcação, coordenador, descrição e local.
- A lista `/admin/orders` baixa **todas as ~4.600 OSs** de uma vez, sem paginação — principal causa da lentidão.
- O calendário assume "08:00" para OSs sem horário → mar de "08:00 - Sem embarcação".
- A data de criação exibida é a data da importação (24/08/2026) para todas as OSs espelhadas, não a data real de abertura no Omie.
- As 1.328 tarefas do Auvo têm nome de embarcação; 638 já estão vinculadas a OSs → backfill imediato possível.

## Etapa 1 — Enriquecer o espelho Omie (omie-sync v2)

- Capturar na listagem (`ListarOS`) campos hoje ignorados:
  - `InformacoesAdicionais.dDtIncReg` → nova coluna `omie_created_date` (data real de abertura).
  - `Observacoes.cObsOS` → `description`.
  - `InformacoesAdicionais.cCidade`/endereço → `location`.
  - `cCodIntOS` → `client_reference` quando preenchido (hoje descartado).
- Novo modo de enriquecimento profundo (`ConsultarOS`), incremental e em lotes com backoff:
  - Prioriza OSs abertas/em andamento; depois backlog histórico em lotes (ex.: 100/execução).
  - Traz serviços prestados (resumo → `description`), data real de conclusão (→ `completed_date` correto em vez de copiar a data prevista) e valor total (→ nova coluna `omie_value`).
- Mantém idempotência por `(company_id, omie_os_id)` e o rate-limit já existente.

## Etapa 2 — Backfill de embarcação via Auvo

- Migração SQL: função que preenche `vessel_id` nas OSs a partir de `auvo_tasks.vessel_name`, com match normalizado (maiúsculas/acentos) contra a tabela `vessels` da empresa. Cobre ~638 OSs de imediato.
- Estender a reconciliação contínua (`reconcile_service_orders_from_auvo`) para repetir esse preenchimento a cada execução.

## Etapa 3 — Migração de schema

- Novas colunas em `service_orders`: `omie_created_date date`, `omie_value numeric`.
- Índices (se ausentes): `(company_id, status)` e `(company_id, scheduled_date)` para acelerar lista, dashboard e calendário.
- Corrigir `completed_date` das OSs concluídas usando a data real do Omie quando o enriquecimento rodar.

## Etapa 4 — Performance e exibição em /admin/orders

- Paginação server-side (50/página) no `useServiceOrders`; busca e filtros de status/embarcação passam a ser aplicados no banco, não no cliente.
- Coluna "Data de Criação" exibe `omie_created_date` quando existir (senão, `created_at`).
- Exportação CSV passa a respeitar os filtros server-side.

## Etapa 5 — Calendário e detalhes da OS

- Calendário: OS sem horário exibe só o número (sem "08:00"); mantém filtros por data já existentes.
- Dialog de detalhes: exibir descrição/observações do Omie, código de integração, valor e data real de abertura.
- Dashboard: sem mudança de lógica (já usa contagens); os cards zerados da primeira captura eram o estado de carregamento.

## Detalhes técnicos

- Arquivos: `supabase/functions/omie-sync/index.ts`, `src/hooks/useServiceOrders.ts`, `src/pages/admin/ServiceOrders.tsx`, `src/components/admin/calendar/ServiceCalendar.tsx`, `src/components/admin/orders/ViewOrderDetailsDialog.tsx`, função SQL `reconcile_service_orders_from_auvo`.
- 1 migração: colunas novas + índices + função de backfill de embarcação (com GRANTs/RLS não aplicáveis — sem tabela nova).
- O `ConsultarOS` é 1 chamada por OS no Omie; por isso o enriquecimento profundo é incremental para não estourar o rate limit — carga histórica completa leva algumas execuções do cron.
- Campos que o Omie não possui (coordenador responsável, equipe técnica) seguem preenchidos apenas para OSs criadas no Arrow ou reconciliadas com o Auvo.
