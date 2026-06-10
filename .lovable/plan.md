
# Gráficos analíticos no módulo de Qualidade — Fase 1

Objetivo: elevar o dashboard de Qualidade do nível "contador numérico" para análise de tendências, distribuição e planejamento, alinhado ao que SoftExpert, Qualyteam e Sênior entregam. Esta fase entrega 4 visualizações de alto impacto no Dashboard Principal.

## Onde os gráficos aparecem

Nova seção **"Análise visual"** na aba *Visão Geral* do `/quality/dashboard` (`src/pages/quality/Dashboard.tsx`), abaixo dos KPIs operacionais e antes do bloco de "Revisões em atraso". Layout em grid 2x2 no desktop, 1 coluna no mobile.

Cada gráfico vira um componente próprio em `src/components/quality/charts/` para reaproveitamento futuro em Relatórios e PDFs.

## Filtros de período — escopo definido

| Gráfico | Período |
|---|---|
| Pareto de RNCs | **Seletor compartilhado** (90d / 6m / 12m / ano corrente) — padrão 12m |
| Donut de Planos de Ação | **Seletor compartilhado** — padrão 12m |
| Maturidade da Matriz | **Fixo: situação atual** (snapshot, sem filtro de período) |
| Tendência de Vencimentos | **Fixo: próximos 12 meses** (olhar para frente, sem filtro) |

O seletor compartilhado fica no header da seção "Análise visual" e afeta apenas Pareto e Donut.

## Os 4 gráficos

### 1. Pareto de RNCs por Processo/Origem
- **Componente:** `NcrParetoChart.tsx`
- **Tipo:** barras verticais ordenadas por frequência + linha de % acumulado (regra 80/20).
- **Dados:** `useQualityNCRs()` agrupando por `process_id` (fallback `origin` quando processo não informado). Top 8 categorias, demais agregadas em "Outros".
- **Interação:** clique numa barra navega para `/quality/ncrs?process=<id>`.
- **Estado vazio:** "Nenhuma RNC registrada no período selecionado."

### 2. Status do Plano de Ação — Rosca
- **Componente:** `ActionPlanStatusDonut.tsx`
- **Tipo:** donut com 4 fatias: **Concluído / Em andamento / Atrasado / Não iniciado**.
- **Dados:** `useQualityActionPlans()`. "Atrasado" = `due_date < hoje` e status não concluído. "Não iniciado" = `proposed`/`pending` sem ações iniciadas.
- **Centro:** total de planos no período. Cores semânticas (verde/azul/vermelho/cinza).
- **Estado vazio:** "Nenhum plano de ação criado no período selecionado."

### 3. Maturidade da Matriz de Competência
- **Componente:** `CompetencyGapByDeptChart.tsx`
- **Tipo:** barras horizontais empilhadas — para cada setor mostra % **Conforme / Gap leve (gap=1) / Gap crítico (gap≥2)**.
- **Dados:** `useQualityMatrix()` cruzando com departamento do colaborador. **Apenas requisitos mandatórios** (`is_mandatory = true`).
- **Ordenação:** maior gap crítico no topo.
- **Estado vazio diferenciado (configuração pendente):**
  - Quando `mandatoryRows.length === 0`: mensagem **"Nenhum requisito mandatório cadastrado na Matriz de Competências. Acesse Competências → Matriz para configurar."** com botão/link direto para `/quality/competencies/matrix`.
  - Distinto do estado "sem dados" — é um estado de **setup pendente** com call-to-action.

### 4. Tendência de Vencimentos — próximos 12 meses
- **Componente:** `UpcomingExpirationsTrendChart.tsx`
- **Tipo:** barras empilhadas mensais (12 colunas), série por categoria:
  - Revisões de documentos (`useQualityDocuments` → `next_review_date`)
  - Calibrações de instrumentos (`useQualityDevices` → `next_calibration_due`)
  - Auditorias planejadas (`useQualityAudits` → `planned_date`)
  - Reavaliação de fornecedores (`useQualitySuppliers` → `next_evaluation_due`)
- **Tratamento explícito de nulos:** registros com data nula são **excluídos** da série correspondente. O gráfico exibe apenas as séries que tenham **ao menos 1 registro** na janela de 12 meses. Se nenhuma série tiver dados, exibe estado vazio "Nenhum vencimento programado nos próximos 12 meses."
- **Destaque visual:** mês com pico (≥ percentil 75 do total) ganha borda em destaque.

## Detalhes técnicos

- **Biblioteca:** Recharts (já instalado), via `ChartContainer` de `src/components/ui/chart.tsx` para herdar tokens.
- **Cores:** exclusivamente tokens semânticos (`--primary`, `--destructive`, `--warning`, `--success`, `--muted`). Nada hardcoded.
- **Agregações:** funções puras em `src/lib/qualityChartAggregations.ts`, todas com guards para arrays/datas nulas. Testáveis isoladamente.
- **Performance:** sem novas queries — reuso de hooks já carregados pela página. Agregações em `useMemo`.
- **Loading:** skeleton com altura fixa para evitar layout shift.
- **Acessibilidade:** títulos h3, descrição textual abaixo de cada gráfico (ex: "3 setores concentram 80% das RNCs"), tooltips com aria-label.

## Fora de escopo desta fase

- Exportação de gráficos para PNG/PDF (fase 2, junto com Relatórios).
- Filtros por departamento/responsável.
- Gráficos dentro das telas internas de Auditorias/RNCs/Indicadores.
- Novas migrations, views ou RPCs.

## Entregáveis

1. 4 componentes em `src/components/quality/charts/`.
2. Nova seção "Análise visual" em `Dashboard.tsx` com seletor de período (afeta apenas Pareto e Donut).
3. Helper `src/lib/qualityChartAggregations.ts` com funções puras de agregação e tratamento explícito de nulos.
