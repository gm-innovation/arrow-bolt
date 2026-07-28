
# Dashboard de PM (Super Admin)

Nova rota `/super-admin/pm-dashboard` com layout de abas, uma por fase do PRD. Reutiliza `support_tickets`, `ai_assistant_actions`, `ai_agents`, `corp_audit_log` e o pipeline da Marina já existentes. Adiciona apenas o que falta: tabelas de estratégia (OST, RICE, roadmap, changelog, métricas) e Edge Functions de IA para scoring/classificação.

## Estrutura de navegação

- Item novo na sidebar do Super Admin: **"Dashboard PM"** (ícone `LayoutDashboard`), acima de "Gestão de IA".
- Página com `<Tabs>` de 4 abas correspondentes às fases do PRD + aba resumo.

---

## Fase 1 — Central de Tickets Agêntica

Aba **Tickets & Contexto**.

1. **Central agêntica**: tabela sobre `support_tickets` já existente, exibindo os campos gerados pela Marina (resumo IA, categoria, setor impactado, anexos, `dev_prompt` sugerido). Reaproveita o inbox atual em `SupportInbox`, embutindo-o via componente compartilhado com filtros extras (status, categoria, setor, período).
2. **Blast Radius**: gráfico de barras (recharts) agregando `support_tickets.impacted_module` + `corp_audit_log.entity_type` dos últimos 30/90 dias para mostrar quais dos 10 módulos navais sofrem mais alterações. Se `impacted_module` ainda não existir em `support_tickets`, adicionar via migration + backfill pela IA de triagem.

## Fase 2 — Estratégia e Descoberta

Aba **OST & North Star**.

1. **Opportunity Solution Tree**: nova tabela `pm_ost_nodes` (id, parent_id, type: outcome|opportunity|solution|experiment, title, description, north_star_metric_id, created_by). Renderização em árvore com `react-flow` (já usado em outras telas de qualidade) ou fallback com árvore custom em Tailwind. Cada ticket pode ser vinculado a um nó (`pm_ticket_ost_links`).
   - Edge Function `pm-suggest-ost-node`: recebe ticket, retorna nó sugerido usando Gemini 2.5 Flash com contexto da árvore atual.
2. **Métricas North Star**: tabela `pm_north_star_metrics` (name, description, unit, target, current_value, updated_at, formula_notes). Cards fixos no topo da aba, com sparkline via `pm_metric_snapshots` (opcional para histórico manual/via cron).

## Fase 3 — Priorização Inteligente

Aba **RICE & Roadmap**.

1. **RICE automático**: colunas `reach`, `impact`, `confidence`, `effort`, `rice_score`, `rice_rationale` em `support_tickets` (migration). Edge Function `pm-rice-score` calcula via IA com base em: descrição do ticket, categoria, quantidade de usuários no papel afetado (query em `profiles`+`user_roles`), histórico de tickets similares. Botão "Recalcular" por ticket + job em lote.
   - Lista ordenada por `rice_score` desc, destacando "Quick Wins" (impact ≥ 2 e effort ≤ 1) com badge.
2. **Roadmap Now/Next/Later**: coluna `roadmap_horizon` enum ('now','next','later','icebox') em `support_tickets`. UI em 3 colunas Kanban (drag-and-drop com `@dnd-kit`, já presente).

## Fase 4 — Monitoramento IA & Changelog

Aba **IA & Impacto**.

1. **AI Performance Tracking**: cards com métricas agregadas de `ai_assistant_actions`, `ai_feedback` e `ai_messages`:
   - Taxa de resolutividade (feedback positivo/total).
   - Taxa de alucinação estimada (feedback negativo com motivo "informação incorreta").
   - Latência média, tokens/dia, custo estimado.
   - Divisão por agente (Marina interna vs. agente de leads do site — filtro em `ai_agents.slug`).
2. **Changelog de Impacto**: nova tabela `pm_changelog` (title, description, released_at, related_ticket_ids uuid[], north_star_metric_id, metric_before, metric_after, notes). Timeline em ordem cronológica reversa; entrada manual + import opcional de tickets com status `resolved`.

---

## Detalhes técnicos

### Migrations (uma por fase)

- `pm_dashboard_phase1`: adiciona `impacted_module text`, `ai_summary text` em `support_tickets` se faltarem. GRANTs + policies (super_admin only via `has_role`).
- `pm_dashboard_phase2`: cria `pm_ost_nodes`, `pm_ticket_ost_links`, `pm_north_star_metrics`, `pm_metric_snapshots` com RLS restrita a `super_admin` + leitura para `director`. GRANTs completos.
- `pm_dashboard_phase3`: adiciona `reach smallint`, `impact smallint`, `confidence smallint`, `effort smallint`, `rice_score numeric generated always as ((reach*impact*confidence)/nullif(effort,0)) stored`, `rice_rationale text`, `roadmap_horizon text` em `support_tickets`.
- `pm_dashboard_phase4`: cria `pm_changelog` com RLS super_admin write / director read.

### Edge Functions (Lovable AI Gateway, `google/gemini-3.6-flash`)

- `pm-rice-score`: input ticket_id → escreve RICE + rationale.
- `pm-suggest-ost-node`: input ticket_id → sugere `ost_node_id`.
- `pm-triage-impacted-module`: backfill/on-insert de `impacted_module`.

Reaproveita helper `createLovableAiGatewayProvider` já usado nas outras funções.

### Frontend

- `src/pages/super-admin/PMDashboard.tsx` (layout + tabs).
- `src/components/super-admin/pm/` com subcomponentes: `AgenticTicketTable.tsx`, `BlastRadiusChart.tsx`, `OSTTree.tsx`, `NorthStarCards.tsx`, `RiceTable.tsx`, `RoadmapBoard.tsx`, `AIPerformancePanel.tsx`, `ChangelogTimeline.tsx`.
- Hooks em `src/hooks/`: `usePMTickets`, `usePMOst`, `usePMNorthStar`, `usePMRice`, `usePMRoadmap`, `usePMAIPerformance`, `usePMChangelog`.
- Rota registrada em `App.tsx` sob `ProtectedRoute` com `allowedRoles={["super_admin"]}` + item no `DashboardLayout` do super admin.

### Segurança

- Todas as tabelas PM: RLS ativa, policies via `has_role(auth.uid(),'super_admin')` para write, leitura opcional para `director`. GRANTs `authenticated`+`service_role` conforme regra.

### Entrega incremental sugerida

Cada fase é um turno de implementação separado (migration + UI + edge functions da fase). Começamos pela Fase 1 na aprovação.
