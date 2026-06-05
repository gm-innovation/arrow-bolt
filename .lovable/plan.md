
# Sprint 3.1 — Melhorias Consolidadas

Sem auditoria iminente, prosseguimos na ordem padrão. Esta sprint fecha o ciclo PDCA dando ao Gestor da Qualidade **uma fila única** de oportunidades de melhoria, agregando origens que hoje vivem isoladas (NCRs, Auditorias, Análise Crítica, Reclamações de Cliente e itens manuais).

## Objetivo
Página `/quality/improvements` que lista, prioriza e acompanha **todas** as oportunidades de melhoria do SGQ, independentemente da origem, com vínculo bidirecional ao Plano de Ação correspondente.

## Escopo

### Origens consolidadas (read-only, sem duplicar dados)
- `quality_ncrs` (status ≠ closed, ou com `improvement_opportunity=true`)
- `quality_audit_findings` (não-conformidades e observações)
- `quality_management_review_outputs` (saídas da Análise Crítica que viram melhoria)
- `quality_complaints` (reclamações de cliente com tratamento pendente)
- **Melhorias manuais** (nova tabela `quality_improvements_manual` — sugestões de colaboradores que não nasceram de NCR/auditoria)

### O que NÃO entra
- Não recria entidades; é uma camada de leitura unificada.
- Não substitui as telas de NCR/Auditoria/Análise Crítica — cada origem mantém sua tela própria; aqui é a **visão consolidada**.

## Estrutura técnica

### 1. View consolidada (sem trigger, sem duplicação)
`quality_improvements_v` — UNION ALL das 5 origens, colunas padronizadas:

```text
id              uuid       -- id do registro de origem
company_id      uuid
source          text       -- ncr | audit_finding | review_output | complaint | manual
source_label    text       -- "NCR-2026-001", "Auditoria Interna Q1", etc.
title           text
description     text
priority        text       -- high | medium | low (derivado por origem)
status          text       -- open | in_progress | done | cancelled
opened_at       timestamptz
due_date        date       -- null se não houver
owner_user_id   uuid       -- responsável
action_plan_id  uuid       -- vínculo com quality_action_plans (se existir)
source_url      text       -- deep link para a tela de origem
```

Regras de mapeamento por origem documentadas em comentário SQL na view.

### 2. Nova tabela `quality_improvements_manual`
Para sugestões espontâneas (kaizen, ideias de colaboradores) que não nasceram em outra entidade. Mesmos campos básicos + `submitted_by`, `category`.

GRANTs + RLS por `company_id` + papel (qualquer colaborador insere; coordinator/director/super_admin gerencia).

### 3. Vínculo com Plano de Ação
Botão **"Gerar Plano de Ação"** em cada linha que ainda não tem `action_plan_id`. Cria registro em `quality_action_plans` herdando `title`, `owner_user_id`, `due_date` e preenchendo `source` + `source_id` (já existem nessa tabela ou serão adicionados se faltarem — verificar na implementação).

## Frontend

### Página `/quality/improvements`
- **Filtros:** origem (multi), status, prioridade, responsável, período, com/sem plano de ação.
- **Cards de KPI no topo:** total aberto, vencidos, sem responsável, sem plano de ação.
- **Tabela** com colunas: Origem (badge colorido), Identificador, Título, Prioridade, Responsável, Prazo, Status, Plano de ação (✓/Gerar).
- **Linha clicável** → drawer lateral com detalhes + link para tela de origem.
- **Ação em massa:** atribuir responsável, gerar planos de ação em lote.

### Hook `useQualityImprovements`
Consome a view + CRUD da tabela manual.

### Navegação
Item **"Melhorias"** (ícone `Sparkles` ou `TrendingUp`) em `DashboardLayout.tsx`, dentro do menu Qualidade, entre "Análise Crítica" e "Indicadores".

## Permissões
- **Visualizar:** super_admin, director, coordinator, qualquer papel com acesso ao módulo Qualidade.
- **Criar melhoria manual:** todos os colaboradores autenticados (`company_id` scoped).
- **Editar/atribuir/gerar plano:** super_admin, director, coordinator.

## Entregáveis
1. Migration: tabela `quality_improvements_manual` + view `quality_improvements_v` + (se necessário) colunas `source`/`source_id` em `quality_action_plans` + RLS + GRANTs.
2. Hook `useQualityImprovements.ts`.
3. Página `src/pages/quality/Improvements.tsx` + drawer de detalhes.
4. Item de menu em `DashboardLayout.tsx` + rota em `App.tsx`.
5. Atualização do `quality_review_status_v` ou criação de KPI próprio para alimentar o card "Melhorias abertas" no dashboard de Indicadores.

## Fora do escopo (próximas sprints)
- Sprint 3.2 — Saúde e Segurança via GED
- Sprint 3.3 — Conscientização ("Li e ciente" + Matriz de Competência)
- Sprint 3.4+ — Riscos/Oportunidades §6.1, Fornecedores §8.4, Calibração §7.1.5
