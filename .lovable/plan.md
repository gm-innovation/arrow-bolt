

## Plano: Etapa 2 - Paginas Funcionais do Modulo Comercial

### Resumo

Implementar as 4 paginas funcionais do modulo comercial com dados reais do banco, incluindo 3 hooks de dados, componentes de dashboard, tabela de clientes expandida, pipeline de oportunidades (Kanban + Lista) e gestao de compradores.

---

### 1. Hooks de Dados (3 novos arquivos)

#### 1.1. `src/hooks/useOpportunities.ts`
- Busca `crm_opportunities` com joins em `clients(name)`, `crm_buyers(name)`, `profiles(full_name)` via `assigned_to`
- Filtro por `company_id` do usuario logado
- Mutations: criar, atualizar (incluindo mudanca de estagio), deletar
- Usa `useQuery` / `useMutation` do TanStack React Query (padrao do projeto)

#### 1.2. `src/hooks/useBuyers.ts`
- CRUD completo para `crm_buyers`
- Join com `clients(name)` para exibir o nome do cliente associado
- Filtro por `company_id`

#### 1.3. `src/hooks/useCommercialStats.ts`
- KPIs calculados a partir de `crm_opportunities`:
  - Total do pipeline (soma `estimated_value` onde stage != closed_won/closed_lost)
  - Oportunidades abertas (count)
  - Taxa de conversao (closed_won / total fechadas)
  - Valor fechado no mes (soma estimated_value onde stage = closed_won e closed_at no mes atual)
- Dados para grafico de funil (count e valor por estagio)
- Clientes por segmento (count agrupado por `segment` da tabela `clients`)

---

### 2. Dashboard Comercial (`src/pages/commercial/Dashboard.tsx`)

#### 2.1. Componentes novos:

**`src/components/commercial/dashboard/CommercialStats.tsx`**
- 4 cards de KPI usando o mesmo padrao visual do `DashboardStats.tsx` do admin:
  - Valor do Pipeline (icone DollarSign)
  - Oportunidades Abertas (icone Target)
  - Taxa de Conversao (icone TrendingUp)
  - Valor Fechado no Mes (icone CheckCircle2)

**`src/components/commercial/dashboard/PipelineChart.tsx`**
- Grafico de barras horizontais (Recharts, ja instalado) mostrando quantidade e valor por estagio
- Cores distintas por estagio (azul -> verde -> amarelo -> vermelho)

**`src/components/commercial/dashboard/RecentOpportunities.tsx`**
- Lista das 5 oportunidades mais recentes
- Mostra titulo, cliente, valor, estagio (badge colorido), prioridade
- Link para pagina de oportunidades

---

### 3. Pagina de Clientes (`src/pages/commercial/Clients.tsx`)

- Tabela completa usando componentes `Table` do shadcn/ui
- Colunas: Nome, CNPJ, Segmento, Status Comercial, Receita Anual, Ultimo Contato, Acoes
- Filtros: busca por texto, filtro por segmento (select), filtro por status comercial (select)
- Badges coloridos para status comercial (prospect=azul, active=verde, inactive=cinza, churned=vermelho)
- Botao "Novo Cliente" abre dialog com formulario incluindo campos comerciais
- Botao "Editar" abre dialog de edicao
- Botao "Ver Oportunidades" navega para oportunidades filtradas por cliente
- Exportar CSV
- Formulario de cliente:
  - Dados basicos: nome, CNPJ, email, telefone, endereco, pessoa de contato
  - Dados comerciais: segmento (select), status comercial (select), receita anual, fonte/origem (select), notas, ultimo contato (date picker)

**Componentes novos:**
- `src/components/commercial/clients/ClientsTable.tsx` - Tabela com filtros
- `src/components/commercial/clients/NewClientDialog.tsx` - Dialog criar/editar cliente
- `src/components/commercial/clients/ClientCommercialInfo.tsx` - Secao de info comercial no formulario

---

### 4. Pagina de Oportunidades (`src/pages/commercial/Opportunities.tsx`)

#### 4.1. Toggle de visualizacao (Kanban / Lista)
- Botoes para alternar entre visao Kanban e visao Lista
- Estado salvo localmente

#### 4.2. Visao Kanban

**`src/components/commercial/opportunities/OpportunityKanban.tsx`**
- 6 colunas: Identificada, Qualificada, Proposta, Negociacao, Fechada (Ganha), Fechada (Perdida)
- Drag-and-drop entre colunas usando `@hello-pangea/dnd` (ja instalado)
- Cada coluna mostra total de valor e count
- Header colorido por estagio

**`src/components/commercial/opportunities/OpportunityCard.tsx`**
- Card compacto com: titulo, nome do cliente, valor estimado, probabilidade (barra de progresso), prioridade (badge)
- Click abre detalhes

#### 4.3. Visao Lista
- Tabela com colunas: Titulo, Cliente, Tipo, Valor, Probabilidade, Estagio, Prioridade, Data Prevista, Responsavel
- Ordenacao por coluna
- Filtros: busca, estagio, prioridade, tipo

#### 4.4. Dialogs

**`src/components/commercial/opportunities/NewOpportunityDialog.tsx`**
- Formulario: titulo, cliente (select com busca), comprador (select filtrado por cliente), tipo, estagio, prioridade, valor estimado, probabilidade (slider 0-100), data prevista, descricao, notas
- Validacao com campos obrigatorios (titulo, cliente, estagio)

**`src/components/commercial/opportunities/EditOpportunityDialog.tsx`**
- Mesmo formulario preenchido com dados existentes
- Campo extra: motivo da perda (quando estagio = closed_lost)

**`src/components/commercial/opportunities/OpportunityDetails.tsx`**
- Sheet/Dialog lateral com todas as informacoes
- Timeline de atividades (usando `crm_opportunity_activities`)
- Botao para adicionar atividade (tipo, descricao, data)

**`src/components/commercial/opportunities/ActivityTimeline.tsx`**
- Lista vertical estilizada de atividades
- Icones por tipo (telefone, email, reuniao, proposta, nota)
- Data e autor de cada atividade

---

### 5. Pagina de Compradores (`src/pages/commercial/Buyers.tsx`)

**`src/components/commercial/buyers/BuyersList.tsx`**
- Tabela: Nome, Cargo, Cliente, Email, Telefone, Nivel de Influencia, Acoes
- Filtro por cliente e por nivel de influencia
- Badge colorido para nivel (decisor=roxo, influenciador=azul, usuario=cinza)

**`src/components/commercial/buyers/NewBuyerDialog.tsx`**
- Formulario: nome, cargo, cliente (select), email, telefone, nivel de influencia (select), notas
- Modo edicao com dados preenchidos

---

### 6. Arquivos a Criar (total: 16)

```text
src/hooks/useOpportunities.ts
src/hooks/useBuyers.ts
src/hooks/useCommercialStats.ts

src/components/commercial/dashboard/CommercialStats.tsx
src/components/commercial/dashboard/PipelineChart.tsx
src/components/commercial/dashboard/RecentOpportunities.tsx

src/components/commercial/clients/ClientsTable.tsx
src/components/commercial/clients/NewClientDialog.tsx
src/components/commercial/clients/ClientCommercialInfo.tsx

src/components/commercial/opportunities/OpportunityKanban.tsx
src/components/commercial/opportunities/OpportunityCard.tsx
src/components/commercial/opportunities/NewOpportunityDialog.tsx
src/components/commercial/opportunities/EditOpportunityDialog.tsx
src/components/commercial/opportunities/OpportunityDetails.tsx
src/components/commercial/opportunities/ActivityTimeline.tsx

src/components/commercial/buyers/NewBuyerDialog.tsx
```

### 7. Arquivos a Modificar (total: 4)

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/commercial/Dashboard.tsx` | Importar e renderizar CommercialStats, PipelineChart, RecentOpportunities |
| `src/pages/commercial/Clients.tsx` | Implementar pagina completa com ClientsTable e NewClientDialog |
| `src/pages/commercial/Opportunities.tsx` | Implementar Kanban + Lista com toggle, dialogs |
| `src/pages/commercial/Buyers.tsx` | Implementar lista com NewBuyerDialog |

---

### 8. Padroes Seguidos

- Hooks com `useQuery`/`useMutation` do TanStack (mesmo padrao de `useServiceOrders`)
- Busca de `company_id` via `profiles` do usuario logado
- Componentes shadcn/ui existentes (Card, Table, Dialog, Badge, Select, Input, Button, Sheet)
- Recharts para graficos (ja instalado e usado no admin)
- `@hello-pangea/dnd` para Kanban (ja instalado)
- Layout com `DashboardLayout` userType="commercial"
- Formato brasileiro: datas dd/MM/yyyy, moeda R$, separadores corretos

---

### 9. Ordem de Implementacao

Devido ao volume, sera implementado nesta sequencia dentro de uma mesma iteracao:

1. Hooks (useOpportunities, useBuyers, useCommercialStats)
2. Dashboard (Stats + Charts + Recent)
3. Clientes (Table + Dialog)
4. Oportunidades (Kanban + Lista + Dialogs + Details)
5. Compradores (List + Dialog)

