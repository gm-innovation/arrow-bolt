

## Analise Comparativa e Plano de Correcoes

Apos comparar as 9 telas de referencia com a implementacao atual, identifiquei as seguintes lacunas:

---

### 1. PAGINA FALTANTE: Tarefas Comerciais (Prioridade Alta)

A tela de **Gestao de Tarefas** nao existe no modulo comercial. A referencia mostra uma tabela com: Titulo, Cliente, Prioridade (badges coloridos), Data de Vencimento, Status, Acoes.

**Acao:**
- Criar tabela `crm_tasks` no banco de dados (id, company_id, title, client_id FK, assigned_to FK, priority, due_date, status, description, opportunity_id FK nullable)
- RLS para commercial e admin
- Criar hook `src/hooks/useCommercialTasks.ts`
- Criar pagina `src/pages/commercial/Tasks.tsx` com busca, tabela, dialog CRUD
- Adicionar rota em `App.tsx` e item "Tarefas" no menu lateral em `DashboardLayout.tsx` (entre Oportunidades e Recorrencias)

---

### 2. Dashboard Executivo (Reformulacao Completa)

O dashboard atual tem 4 KPIs simples + 2 graficos. A referencia tem um layout muito mais rico:

**KPI Cards (linha 1):** Clientes Ativos (com total), Receita Recorrente (mensal), Ticket Medio, Clientes em Risco (destaque vermelho)

**Cards informativos (linha 2):**
- Renovacoes Proximas (30, 30-60, 60-90 dias com contadores + link "Ver Todas")
- Pipeline de Oportunidades (contagem + valor + link "Ver Pipeline Completo")
- Acoes Pendentes (Alertas Ativos, Visitas Agendadas, Propostas Pendentes + link "Central de Alertas")

**Cards de alerta (linha 3):**
- Alertas Prioritarios (com empty state verde "Tudo sob controle!")
- Clientes em Risco (com empty state ou lista)

**Acao:**
- Reescrever `src/pages/commercial/Dashboard.tsx` com o novo layout
- Reescrever `src/components/commercial/dashboard/CommercialStats.tsx` com os novos KPIs
- Criar componentes: `RenewalsSummaryCard`, `PipelineSummaryCard`, `PendingActionsCard`, `PriorityAlertsCard`, `AtRiskClientsCard`
- O hook `useCommercialStats` precisa buscar dados adicionais (clientes, recorrencias proximas, contadores de acoes)

---

### 3. Recorrencias - KPIs e Toggle Lista/Calendario

A referencia tem:
- 4 KPI cards: MRR (Receita Recorrente), Proximas 30 dias, 30-60 dias, Atrasadas (vermelho)
- Toggle Lista / Calendario
- Coluna "Tipo" com badge, dias de atraso ao lado da data, status "Atrasada" em vermelho

**Acao:**
- Adicionar secao de KPI cards ao topo de `Recurrences.tsx`
- Adicionar toggle Lista/Calendario (calendario pode ser placeholder inicial)
- Adicionar calculo de "atrasada" (next_date < hoje e status = active)
- Exibir dias de atraso na coluna de data
- Adicionar coluna "Tipo" com badge

---

### 4. Medicoes - KPIs e Sincronizar

A referencia tem:
- 5 KPI cards: Total, Concluidas (verde), Em Andamento (amarelo), Canceladas (vermelho), Valor Total (azul)
- Botao "Sincronizar" no header
- Colunas: Numero da OS, Cliente, Embarcacao, Status, Valor Total, Data, Acoes (olho + sync)

**Acao:**
- Adicionar KPI cards ao topo de `Measurements.tsx`
- Adicionar botao "Sincronizar" no header
- Adicionar coluna "Embarcacao" e icones de acao

---

### 5. Oportunidades - KPI Cards no Topo

A referencia mostra 4 KPI cards acima do Kanban: Total de Oportunidades, Valor Total, Idade Media (dias no pipeline), Estagios Ativos.

**Acao:**
- Adicionar secao de KPI cards em `Opportunities.tsx` (visivel em ambos os modos kanban/lista)
- Calcular idade media baseado em created_at das oportunidades abertas

---

### 6. Relatorios - Graficos Avancados e Filtros Globais

A referencia tem conteudo muito mais rico:
- Filtros globais: Periodo, Responsavel, Cliente + botao "Limpar Filtros"
- Tabs: "Visualizacao Grafica" / "Relatorios em Lista"
- 6 graficos: Funil de Oportunidades (area), Receita por Segmento, Distribuicao Clientes por Segmento (pie), Desempenho por Vendedor (line), Oportunidades por Tipo (pie), Recorrencias por Urgencia (pie)
- Linha inferior: Tendencia de Criacao de Oportunidades (bar+line), Taxa de Conversao entre Estagios (horizontal bar)

**Acao:**
- Reescrever `Reports.tsx` com filtros globais
- Adicionar sub-tabs "Visualizacao Grafica" / "Relatorios em Lista"
- Adicionar os 8 graficos conforme referencia
- Manter tabs "Dashboard Executivo" e "Forecast de Vendas" como botoes no header

---

### 7. Menu Lateral - Notificacoes e Tarefas

A referencia mostra "Tarefas" entre Oportunidades e Recorrencias, e "Notificacoes" ao final do menu.

**Acao:**
- Adicionar "Tarefas" ao `commercialMenuItems` em `DashboardLayout.tsx`
- Adicionar "Notificacoes" ao menu (ja existe o componente NotificationBell, mas falta pagina dedicada)

---

### Resumo de Arquivos

| Tipo | Arquivos |
|------|----------|
| Criar | `src/pages/commercial/Tasks.tsx`, `src/hooks/useCommercialTasks.ts` |
| Reescrever | `src/pages/commercial/Dashboard.tsx`, `src/components/commercial/dashboard/CommercialStats.tsx` |
| Modificar | `src/pages/commercial/Recurrences.tsx` (KPIs + toggle + atraso), `src/pages/commercial/Measurements.tsx` (KPIs + sync), `src/pages/commercial/Opportunities.tsx` (KPIs), `src/pages/commercial/Reports.tsx` (filtros + graficos), `src/components/DashboardLayout.tsx` (menu), `src/App.tsx` (rota tarefas), `src/hooks/useCommercialStats.ts` (dados adicionais) |
| Migracao | 1 (tabela `crm_tasks` + RLS) |

### Detalhes Tecnicos

**Tabela `crm_tasks`:**
```text
id            uuid PK default gen_random_uuid()
company_id    uuid FK -> companies NOT NULL
client_id     uuid FK -> clients (nullable)
opportunity_id uuid FK -> crm_opportunities (nullable)
assigned_to   uuid (nullable)
title         text NOT NULL
description   text
priority      text default 'medium' (low, medium, high, urgent)
status        text default 'pending' (pending, in_progress, completed, cancelled)
due_date      date
created_by    uuid
created_at    timestamptz default now()
updated_at    timestamptz default now()
```

**RLS:** commercial e admin na mesma empresa podem CRUD. Manager pode SELECT.

**Ordem de implementacao:** Migracao -> Tasks page + hook -> Dashboard refactor -> Recorrencias KPIs -> Medicoes KPIs -> Oportunidades KPIs -> Relatorios avancados -> Menu ajustes

