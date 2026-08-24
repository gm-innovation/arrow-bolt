# Plano: OSs completas via Auvo (operacional) + Omie (etapa/valores) + performance

## Diagnóstico (confirmado no banco e no código)

- **O Auvo tem tudo que falta**: as 1.328 tarefas sincronizadas trazem embarcação, técnico, data, endereço, orientações e check-in/check-out — mas **690 estão desvinculadas** porque o Auvo grava o número como `OS5539` e o Arrow/Omie como `5539`; a reconciliação compara texto exato.
- **O Omie só serve para etapa e valores**: o espelho atual grava número, cliente, status e data prevista — não grava valor nem data real de abertura.
- **Lentidão**: a lista `/admin/orders` baixa todas as ~4.600 OSs de uma vez, sem paginação.
- **Calendário poluído**: OSs sem horário aparecem como "08:00 - Sem embarcação".
- Detalhe da OS vazio (Equipe/Local/Descrição) é consequência dos pontos acima.

## Etapa 1 — Corrigir o vínculo Auvo ↔ Arrow (causa raiz)

- Normalizar o número da OS no matching: remover prefixo "OS", espaços e diferenças de caixa (ex.: `OS5539` = `5539`).
- Backfill único: religar as ~690 tarefas órfãs às OSs já espelhadas.
- Ajustar também o `auvo-sync`/reconciliação contínua para usar sempre o número normalizado.

## Etapa 2 — Reconciliação enriquecida: Auvo preenche a OS

Estender a função `reconcile_service_orders_from_auvo` para popular nas OSs, quando vazio:
- `vessel_id` — match normalizado de `auvo_tasks.vessel_name` com a tabela `vessels` da empresa.
- `scheduled_date` — primeira `task_date`; `completed_date` — último `checkout_at` (quando concluída).
- `location` — `address`; `description` — `orientation` das tarefas.
- Equipe/técnico visível no detalhe a partir do `technician_name` do Auvo (match por nome normalizado com perfis; quando não bater, exibir o nome do Auvo como texto).

## Etapa 3 — Omie enxuto: só etapa e valores

- Manter o espelho de status por etapa (já funciona).
- Capturar na listagem o que estiver disponível: `dDtIncReg` → nova coluna `omie_created_date` (data real de abertura, hoje a lista mostra a data da importação), `cCodIntOS` → `client_reference`, valor total → nova coluna `omie_value`.
- Enriquecimento pontual via `ConsultarOS` apenas para OSs abertas/em andamento sem valor (lotes com backoff, sem varrer o histórico inteiro).
- Não extrair embarcação/descrição do Omie — isso é papel do Auvo.

## Etapa 4 — Performance e exibição em /admin/orders

- Paginação server-side (50/página) no `useServiceOrders`; busca e filtros (status/embarcação) aplicados no banco.
- "Data de Criação" exibe `omie_created_date` quando existir.
- Exportação CSV respeitando os filtros server-side.
- Índices de suporte: `(company_id, status)` e `(company_id, scheduled_date)` se ausentes.

## Etapa 5 — Calendário e detalhe da OS

- Calendário: OS sem horário definido mostra apenas número + embarcação (sem "08:00" fictício).
- Dialog de detalhes: passa a exibir embarcação, local, datas reais e equipe vindos do Auvo, além de valor e etapa do Omie.

## Detalhes técnicos

- Arquivos: migração SQL (normalização + backfill + colunas `omie_created_date`/`omie_value` + índices), função `reconcile_service_orders_from_auvo`, `supabase/functions/omie-sync/index.ts`, `supabase/functions/auvo-sync/index.ts`, `src/hooks/useServiceOrders.ts`, `src/pages/admin/ServiceOrders.tsx`, `src/components/admin/calendar/ServiceCalendar.tsx`, `src/components/admin/orders/ViewOrderDetailsDialog.tsx`.
- A normalização usa `regexp_replace(upper(order_number), '[^0-9]', '', 'g')` (apenas dígitos) — cobre `OS5539`, `os 5539` e `5539`.
- Match de embarcação: `upper(unaccent(...))` trimado contra `vessels.name`; nomes sem correspondente ficam como texto no detalhe e entram em log para cadastro.
- Sem tabelas novas — GRANTs/RLS não se aplicam.
