# Visão estratégica de divergências de materiais para a Diretoria

Objetivo: no dashboard da diretoria (`/manager/dashboard`), expor de forma imediata as informações críticas de divergência entre materiais baixados do estoque e o que foi relatado nos relatórios técnicos (auditoria Auvo), hoje visíveis apenas na tela de auditoria.

## O que a diretoria passará a ver

1. **Faixa de alerta crítico no topo da Visão Geral**
   - Quantidade de materiais retirados do estoque e **não relatados** (severidade crítica) ainda pendentes de revisão.
   - Valor total em risco (R$) e valor já tratado no período.
   - Idade da divergência crítica mais antiga sem revisão (destaque quando passar de alguns dias).
   - Botão "Ver auditoria" que leva a `/manager/auvo-audit`.
   - A faixa só aparece quando existirem pendências; sem pendências, mostra um indicador discreto de "sem divergências pendentes".

2. **Nova aba "Divergências" no dashboard**
   - Painel de eficiência da auditoria já existente (detectadas, corrigidas, pendentes, taxa de resolução, valor recuperado, rankings por técnico e por cliente, evolução mensal).
   - Lista das divergências críticas pendentes mais relevantes (OS, cliente, embarcação/técnico, material, quantidade, valor em risco, dias em aberto), com link direto para a revisão do serviço na tela de auditoria.

3. **Indicador nos KPIs gerenciais**
   - Um cartão adicional em `ManagerStats` com "Divergências pendentes" e o valor em risco, seguindo o mesmo estilo dos demais cartões.

## Notas técnicas

- Permissões já estão corretas: as políticas de acesso das tabelas de auditoria Auvo (`auvo_material_discrepancies`, `auvo_tasks`, `auvo_service_groups`, `auvo_task_reports`, `auvo_report_materials`) já contemplam o papel `director`. Nenhuma migração é necessária.
- Reuso de código: `AuvoInsightsPanel` (hoje em `src/components/admin/auvo/`) será reaproveitado na aba nova; o hook `useAuvoInsights` já entrega os agregados por período. A faixa de alerta usará um hook novo e enxuto (`useAuvoCriticalSummary`) com contagem, valor em risco e data da mais antiga pendente, filtrando por `classification` crítica e `review_status = 'pending'`.
- Filtro de período: a aba respeita o intervalo de datas dos filtros do dashboard; sem intervalo definido, usa os últimos 90 dias.
- Nenhuma alteração de regra de negócio da auditoria: a revisão/tratamento continua acontecendo em `/manager/auvo-audit`.

## Arquivos previstos

- `src/pages/manager/Dashboard.tsx` — nova aba e faixa de alerta.
- `src/components/manager/dashboard/AuvoDiscrepancyAlert.tsx` — faixa crítica (novo).
- `src/components/manager/dashboard/AuvoDiscrepancyTab.tsx` — aba com painel + lista de críticas (novo).
- `src/hooks/useAuvoCriticalSummary.ts` — resumo para a faixa e o KPI (novo).
- `src/components/manager/dashboard/ManagerStats.tsx` — cartão de divergências pendentes.
