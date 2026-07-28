## Diagnóstico

O card "Backlog de tickets abertos" mostra **2**, mas o banco tem **24** tickets em `open`/`in_progress` (20 open + 4 in_progress).

Causa: os cards do PM Dashboard leem `current_value` da tabela `pm_north_star_metrics`, que só é atualizada quando a Edge Function `pm-product-metrics-refresh` roda. O último refresh foi às 12:20 de hoje; **22 dos tickets foram criados às 13:16**, depois do refresh. A função em si está correta (filtra `status in ('open','triaging','in_progress')`), o valor apenas ficou defasado. O mesmo problema afeta `tickets_new_7d`, `tickets_bug_7d` e `ticket_resolution_days`.

## Solução

Fazer os KPIs de tickets serem **live** (lidos direto de `support_tickets`), em vez de dependerem do snapshot manual.

### 1. Card de tickets ler contagem em tempo real
No componente que renderiza os cards de métricas do PM Dashboard (arquivo em `src/pages/super-admin/` ou `src/components/super-admin/pm/*` — confirmar no build), para as métricas com `metric_key` iniciando em `tickets_` / `ticket_`:
- Substituir o `current_value` da NSM por uma query própria a `support_tickets`:
  - `tickets_open` → `count` com `status in ('open','triaging','in_progress')`
  - `tickets_new_7d` → `count` com `created_at >= now()-7d`
  - `tickets_bug_7d` → `count` com `category='bug' and created_at >= now()-7d`
  - `ticket_resolution_days` → média de `resolved_at - created_at` (30d)
- Manter o rótulo/target/descrição vindos de `pm_north_star_metrics` — só o número passa a ser live.

### 2. Auto-refresh das demais métricas ao abrir o dashboard
Disparar `pm-product-metrics-refresh` automaticamente ao montar o PM Dashboard se `updated_at` da métrica mais recente for anterior às últimas 6h (evita chamada em toda navegação). Manter o botão manual atual.

### 3. Atualização otimista após ações da Marina
Ao criar/editar ticket via `ai-assistant` ou pelo formulário de ticket, invalidar a query dos cards (`react-query` `invalidateQueries(['pm-nsm'])` e a nova query de tickets) para o card refletir imediatamente.

## Detalhes técnicos

- Arquivos afetados (front): componente de cards do PM Dashboard e `usePMDashboard.ts` (adicionar hook `usePMTicketLiveCounts`).
- Sem migração de banco. Sem alteração da Edge Function.
- Roles: query direta usa cliente Supabase autenticado; RLS de `support_tickets` já permite leitura por `super_admin` (confirmar rapidamente na implementação; caso contrário, adicionar RPC `security definer` para contagem).
- Cache: `staleTime` de 60s para não sobrecarregar.

## Fora do escopo

- Cron server-side (pode ser considerado em uma próxima onda; a auto-refresh no mount + invalidação já resolvem o sintoma).
- Alterar as demais métricas (WAU/MAU/adoção) — permanecem no fluxo de snapshot.
