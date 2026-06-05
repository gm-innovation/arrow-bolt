# Sprint 2.4 — Indicadores e KPIs do SGQ (revisado)

Painel completo de indicadores ISO 9001 §9.1 em `/quality/reports`, consumindo dados dos sprints 2.1–2.3. Sem novas tabelas, sem triggers, sem mutações.

## Decisões confirmadas

1. **Bucket temporal:** mensal. Seletor 3/6/12m apenas filtra client-side.
2. **Janela padrão:** 12 meses (ciclo ISO anual).
3. **Reincidência:** match por `lower(trim(root_cause))` nesta sprint. Tooltip explícito na tela: *"Reincidência baseada em texto idêntico (case-insensitive). Categorização semântica virá em sprint futura."*
4. **Coordinator:** visão global nos KPIs, consistente com RLS atual.

## Catálogo de KPIs (10)

**GED**
- Documentos publicados vs. vencendo em 30 dias
- Tempo médio de aprovação — calculado em `quality_document_versions` como `approved_at - created_at` (campos confirmados como existentes)

**NCRs**
- Abertas por severidade — série temporal mensal
- Tempo médio de tratamento (abertura → `closed`)
- Taxa de reincidência (12m, match texto exato)

**Planos de ação**
- Eficácia (% `effective` sobre avaliados)
- Em atraso (`due_date < now()` e status ativo)

**Auditorias & Análise crítica**
- Planejadas vs. realizadas (12m)
- Findings por classificação
- Reuniões de análise crítica realizadas + saídas em aberto

## Backend (1 migration `sprint_2_4`)

### Índices de suporte (criados antes das views)
```sql
CREATE INDEX IF NOT EXISTS idx_quality_ncrs_company_created
  ON public.quality_ncrs (company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quality_action_plans_company_created
  ON public.quality_action_plans (company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quality_audits_company_created
  ON public.quality_audits (company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quality_documents_company_created
  ON public.quality_documents (company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quality_doc_versions_approved
  ON public.quality_document_versions (document_id, created_at, approved_at);
```
Garante que `generate_series` cruzado com `created_at` use index scan.

### Views (SECURITY INVOKER, herdam RLS das base tables)
- **`quality_kpi_snapshot_v`** — 1 linha por `company_id`, contadores atuais (alimenta os 4 cards).
- **`quality_kpi_timeseries_v`** — gera 12 buckets mensais via `generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month')` e faz `LEFT JOIN` com as tabelas-base filtrando por `created_at >= bucket AND created_at < bucket + 1 month`. Métricas: `ncrs_opened`, `ncrs_closed`, `plans_effective`, `plans_ineffective`, `audits_planned`, `audits_executed`, `documents_published`.
- **`quality_kpi_recurrence_v`** — top 10 `lower(trim(root_cause))` mais frequentes em NCRs dos últimos 12m, com contagem.

### RPC
```sql
quality_kpi_get_overview(p_company_id uuid) RETURNS jsonb
  SECURITY INVOKER
  STABLE
  -- Retorna { cards, series[12], recurrence[10], approval_time_days }
  -- SEMPRE 12 meses (frontend filtra para 3/6/12)
```
Contrato fixo: o parâmetro de período **nunca** atravessa a RPC — proteção contra futuras tentativas de parametrização que quebrariam cache do React Query.

## Frontend

### Hook `src/hooks/useQualityKpis.ts`
```ts
useQuery({
  queryKey: ['quality-kpis', companyId],
  queryFn: () => supabase.rpc('quality_kpi_get_overview', { p_company_id }),
  staleTime: 5 * 60 * 1000,  // 5 min — evita refetch ao trocar de aba
  refetchOnWindowFocus: true,
})
```

### `src/pages/quality/Reports.tsx` (reescrita)
- Header + seletor 3/6/12m (filtragem client-side de `series`)
- **Linha 1 — 4 KpiCards:** NCRs abertas · Planos em atraso · Eficácia % · Docs vencendo em 30d
- **Linha 2 — 4 gráficos Recharts** (grid 2 col):
  - LineChart NCRs abertas vs. fechadas
  - BarChart findings por classificação
  - LineChart eficácia de planos (%)
  - BarChart auditorias planejadas vs. realizadas
- **Linha 3 — Tabela reincidência** (top 10), com tooltip sobre limitação textual
- Empty state quando histórico < 3 meses

### Componentes novos
- `src/components/quality/KpiCard.tsx` — valor + label + delta vs. mês anterior
- `src/components/quality/KpiChart.tsx` — wrapper Recharts com tokens do design system (`hsl(var(--primary))`, etc.) — zero cores hardcoded

### Integração no Dashboard
- Os 4 mesmos `KpiCard` aparecem em `Dashboard.tsx`, reaproveitando o hook (cache compartilhado via React Query)

## Permissões
- `/quality/reports` acessível por `director`, `super_admin`, `coordinator` (somente leitura)
- Sem mutações nesta sprint

## Fora de escopo (futuro)
- Satisfação do cliente / NPS
- Exportação PDF do painel
- Comparativo entre empresas
- Drill-down interativo
- Categorização semântica de causa-raiz
- Segmentação de KPIs por área/coordenador

## Pronto para implementar
Todas as 4 perguntas respondidas e os 4 ajustes técnicos incorporados. Aguardando aprovação para entrar em build mode.
