

## Plano: Modulo CRM Comercial - Fase 1 (Clientes + Oportunidades)

### Visao Geral

Criar um novo modulo acessivel por um novo role `commercial` e tambem por `admin`, integrado ao sistema existente, com foco em gestao de clientes expandida e pipeline de oportunidades de vendas.

---

### 1. Banco de Dados (Migracao)

#### 1.1. Novo role

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'commercial';
```

#### 1.2. Expandir tabela `clients` (campos comerciais)

Adicionar campos na tabela existente:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `segment` | text | Segmento de mercado (Oil & Gas, Naval, etc.) |
| `commercial_status` | text | Status comercial (prospect, active, inactive, churned) |
| `annual_revenue` | numeric | Receita anual estimada |
| `source` | text | Origem do lead (indicacao, site, evento, etc.) |
| `notes` | text | Observacoes comerciais |
| `last_contact_date` | date | Data do ultimo contato |

#### 1.3. Tabela `crm_buyers` (compradores/contatos comerciais)

Separada dos `client_contacts` operacionais, focada em decisores comerciais:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | uuid PK | |
| `client_id` | uuid FK -> clients | |
| `company_id` | uuid FK -> companies | |
| `name` | text NOT NULL | Nome do comprador |
| `role` | text | Cargo (Diretor, Gerente de Compras, etc.) |
| `email` | text | |
| `phone` | text | |
| `influence_level` | text | Nivel de influencia (decisor, influenciador, usuario) |
| `notes` | text | Observacoes |
| `created_at`, `updated_at` | timestamptz | |

#### 1.4. Tabela `crm_opportunities` (pipeline de vendas)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | uuid PK | |
| `company_id` | uuid FK -> companies | |
| `client_id` | uuid FK -> clients | |
| `buyer_id` | uuid FK -> crm_buyers (nullable) | Comprador principal |
| `assigned_to` | uuid FK -> profiles (nullable) | Responsavel |
| `title` | text NOT NULL | Titulo da oportunidade |
| `description` | text | |
| `opportunity_type` | text | Tipo (new_business, renewal, upsell, cross_sell) |
| `stage` | text NOT NULL | Estagio (identified, qualified, proposal, negotiation, closed_won, closed_lost) |
| `priority` | text | Prioridade (low, medium, high, urgent) |
| `estimated_value` | numeric | Valor estimado |
| `probability` | integer | Probabilidade de fechamento (0-100%) |
| `expected_close_date` | date | Data prevista de fechamento |
| `closed_at` | timestamptz | Data real de fechamento |
| `loss_reason` | text | Motivo da perda (quando perdida) |
| `notes` | text | |
| `created_by` | uuid FK -> profiles (nullable) | |
| `created_at`, `updated_at` | timestamptz | |

#### 1.5. Tabela `crm_opportunity_activities` (historico de interacoes)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | uuid PK | |
| `opportunity_id` | uuid FK -> crm_opportunities | |
| `user_id` | uuid FK -> profiles (nullable) | Quem realizou |
| `activity_type` | text | Tipo (call, email, meeting, proposal_sent, note) |
| `description` | text | Detalhes |
| `activity_date` | timestamptz | |
| `created_at` | timestamptz | |

#### 1.6. Politicas RLS

- Commercial e Admin podem gerenciar dados CRM da sua empresa
- Manager pode visualizar dados CRM da sua empresa
- Super Admin pode gerenciar tudo

---

### 2. Frontend - Estrutura de Arquivos

#### 2.1. Novas pastas e arquivos

```text
src/pages/commercial/
  Dashboard.tsx          -- Dashboard com KPIs e pipeline visual
  Clients.tsx            -- Gestao de clientes (expandida com dados comerciais)
  Opportunities.tsx      -- Pipeline de oportunidades (Kanban + lista)
  Buyers.tsx             -- Gestao de compradores/decisores
  Profile.tsx            -- Perfil do usuario
  Settings.tsx           -- Configuracoes

src/components/commercial/
  dashboard/
    CommercialStats.tsx        -- Cards de KPI (valor pipeline, taxa conversao, etc.)
    PipelineChart.tsx          -- Grafico de funil/pipeline
    RecentOpportunities.tsx    -- Lista de oportunidades recentes
  clients/
    ClientCommercialInfo.tsx   -- Informacoes comerciais do cliente
    ClientsTable.tsx           -- Tabela de clientes com filtros
  opportunities/
    OpportunityKanban.tsx      -- Visao Kanban do pipeline
    OpportunityCard.tsx        -- Card de oportunidade no Kanban
    NewOpportunityDialog.tsx   -- Modal de nova oportunidade
    EditOpportunityDialog.tsx  -- Modal de edicao
    OpportunityDetails.tsx     -- Detalhes + historico de atividades
    ActivityTimeline.tsx       -- Timeline de atividades da oportunidade
  buyers/
    BuyersList.tsx             -- Lista de compradores
    NewBuyerDialog.tsx         -- Modal novo comprador

src/hooks/
  useOpportunities.ts    -- CRUD de oportunidades
  useBuyers.ts           -- CRUD de compradores
  useCommercialStats.ts  -- KPIs do dashboard comercial
```

#### 2.2. Alteracoes em arquivos existentes

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/roleRedirect.ts` | Adicionar `commercial: "/commercial/dashboard"` |
| `src/components/DashboardLayout.tsx` | Adicionar `commercialMenuItems` e userType "commercial" |
| `src/components/ProtectedRoute.tsx` | Ja funciona (usa allowedRoles dinamico) |
| `src/App.tsx` | Adicionar rotas `/commercial/*` com ProtectedRoute para `['commercial', 'admin']` |
| `supabase/functions/create-user/index.ts` | Suportar role 'commercial' na criacao |

---

### 3. Detalhamento das Paginas

#### 3.1. Dashboard Comercial
- **KPIs**: Total pipeline, oportunidades abertas, taxa de conversao, valor fechado no mes
- **Grafico de funil**: Quantidade e valor por estagio
- **Oportunidades recentes**: Lista com status e valor
- **Clientes por segmento**: Distribuicao em grafico

#### 3.2. Clientes (expandido)
- Reutiliza a tabela `clients` existente
- Adiciona campos comerciais (segmento, status, receita, fonte, ultimo contato)
- Filtros por segmento e status comercial
- Link rapido para oportunidades do cliente
- Vinculo com compradores

#### 3.3. Oportunidades (Pipeline)
- **Visao Kanban**: Arrastar oportunidades entre estagios (usando `@hello-pangea/dnd` ja instalado)
- **Visao Lista**: Tabela com filtros e ordenacao
- **Detalhes**: Informacoes completas + timeline de atividades
- **Estagios**: Identificada -> Qualificada -> Proposta -> Negociacao -> Fechada (Ganha/Perdida)

#### 3.4. Compradores
- Lista de decisores por cliente
- Nivel de influencia (Decisor, Influenciador, Usuario)
- Vinculo com oportunidades

---

### 4. Menu Lateral (Sidebar)

```text
Commercial Menu:
  - Dashboard
  - Clientes
  - Oportunidades
  - Compradores
  - Configuracoes
```

Cor do gradiente: `from-orange-600 to-amber-600` (distingue das demais areas)

---

### 5. Ordem de Implementacao

Devido ao tamanho, a implementacao sera dividida em etapas sequenciais:

**Etapa 1** - Infraestrutura base:
- Migracao do banco (role, tabelas, RLS)
- Rotas, layout, sidebar, redirect

**Etapa 2** - Paginas funcionais:
- Dashboard com KPIs
- Pagina de Clientes (expandida)
- Pagina de Oportunidades (Kanban + lista)
- Pagina de Compradores
- Hooks de dados

**Etapa 3** - Refinamentos:
- Timeline de atividades
- Drag-and-drop no Kanban
- Filtros avancados
- Profile e Settings

---

### 6. Integracao com o Sistema Existente

- **Clientes**: Os mesmos clientes do modulo operacional (admin) sao visiveis no CRM, mas com dados comerciais adicionais
- **Service Orders**: No futuro, oportunidades fechadas podem gerar ordens de servico automaticamente
- **Notificacoes**: O sistema de notificacoes existente sera reutilizado para alertas comerciais
- **Chat**: O chat existente funcionara para usuarios commercial

