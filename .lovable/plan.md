## Objetivo
Revalidar a área do coordenador após as correções aplicadas (useCorpGroups, ServiceCalendar, Clients com retry, índice `idx_service_orders_company_scheduled`) e confirmar que os 4 bugs identificados foram resolvidos.

## Escopo dos testes (E2E via Playwright autenticado)

Login: `engenharia@googlemarine.com.br` (coordinator)

### 1. Regressão dos bugs corrigidos
- **/admin/groups (useCorpGroups)** — verificar que não há mais HTTP 400; grupos e membros carregam.
- **/admin/calendar (ServiceCalendar)** — navegar mês atual e ±1 mês; confirmar ausência de "Failed to fetch" e tempo de resposta aceitável.
- **/admin/clients** — carregar lista, paginar, buscar; validar retry silencioso em caso de instabilidade.
- **Console global** — confirmar que avisos de VAPID não geram erros bloqueantes.

### 2. Smoke test das rotas principais do coordenador
- `/admin/dashboard` (KPIs novos de leads)
- `/admin/opportunities` (Kanban unificado + aba Leads do Site)
- `/admin/orders` (listagem, abertura, medição final)
- `/admin/calendar`
- `/admin/clients`
- `/admin/technicians`
- `/admin/measurements`
- `/admin/groups`
- `/corp/*` (feed, solicitações, universidade)

### 3. Coleta de evidências
- Screenshot de cada rota testada.
- Captura de console (`page.on("console")`) e network (`page.on("response")`) para status ≥ 400.
- Relatório final por rota: OK / WARN / FAIL com causa provável.

## Entregável
Resumo consolidado listando:
- Bugs anteriores: status (resolvido / persiste).
- Novos problemas encontrados (se houver) com prioridade sugerida.
- Rotas 100% operacionais.

Nenhuma alteração de código nesta rodada — apenas testes e diagnóstico. Correções, se necessárias, serão propostas em plano separado.
