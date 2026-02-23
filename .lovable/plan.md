

## Plano: Etapa 3 - Refinamentos + Modulos Futuros do CRM Comercial

Dada a extensao do escopo solicitado, este plano esta dividido em **fases incrementais** para manter a qualidade e permitir validacao a cada entrega.

---

### FASE 3A - Refinamentos Imediatos (prioridade alta)

#### 1. Profile Comercial (`src/pages/commercial/Profile.tsx`)
- Replicar o padrao do `src/pages/admin/Profile.tsx` existente
- Formulario com: nome completo, email (readonly), telefone
- Upload de avatar usando `AvatarUpload` + `useUserAvatar`
- Card de seguranca com botao "Alterar Senha" usando `ChangePasswordDialog`
- Exibir role "Comercial" abaixo do nome

#### 2. Settings Comercial (`src/pages/commercial/Settings.tsx`)
- Replicar padrao do `src/pages/admin/Settings.tsx`
- Tabs: Notificacoes | Aparencia
- Tab Notificacoes: toggles para email, push, alertas de oportunidades, alertas de recorrencias
- Tab Aparencia: placeholder para tema claro/escuro
- Sem tab WhatsApp (nao aplicavel ao comercial nesta fase)

#### 3. Filtros Avancados - Ordenacao por Coluna
- **ClientsTable**: Adicionar headers clicaveis com icone de seta (ArrowUpDown) para ordenar por Nome, Receita, Ultimo Contato
- **Opportunities (Lista)**: Ordenacao por Titulo, Valor, Probabilidade, Data Prevista
- **Buyers**: Ordenacao por Nome, Cliente, Influencia
- Implementar hook utilitario `useSortableTable` com estado (coluna, direcao) e funcao de comparacao

#### 4. Melhorias Visuais do Kanban
- Kanban responsivo: em telas < 768px, colunas empilhadas verticalmente com accordion (Collapsible) por estagio
- Cards com hover elevado (shadow-md) e transicao suave
- Indicador visual de drop zone ativo (bg colorido quando arrastando sobre)
- Scroll horizontal suave com snap points em desktop
- Empty state por coluna com icone e texto

#### 5. Melhorias Mobile Gerais
- Tabelas: ja usam `hidden md:table-cell` (ok)
- Filtros: garantir que colapsam corretamente em mobile (ja sao flex-col em sm)
- Dialogs: garantir max-h com scroll interno em telas pequenas
- Kanban: implementar visao mobile alternativa

**Arquivos a criar:** 0
**Arquivos a modificar:** 5
- `src/pages/commercial/Profile.tsx` (reescrever)
- `src/pages/commercial/Settings.tsx` (reescrever)
- `src/components/commercial/clients/ClientsTable.tsx` (adicionar ordenacao)
- `src/components/commercial/opportunities/OpportunityKanban.tsx` (melhorias visuais + mobile)
- `src/pages/commercial/Opportunities.tsx` (ordenacao na lista)

---

### FASE 3B - Catalogo de Produtos/Servicos

#### Banco de Dados (migracao)
Nova tabela `crm_products`:
| Campo | Tipo |
|-------|------|
| id | uuid PK |
| company_id | uuid FK -> companies |
| name | text NOT NULL |
| category | text |
| type | text (product / service) |
| is_recurring | boolean default false |
| reference_value | numeric |
| description | text |
| active | boolean default true |
| created_at, updated_at | timestamptz |

RLS: commercial e admin podem gerenciar na sua empresa, manager pode visualizar.

Nova tabela `crm_opportunity_products` (vinculo oportunidade-produto):
| Campo | Tipo |
|-------|------|
| id | uuid PK |
| opportunity_id | uuid FK -> crm_opportunities |
| product_id | uuid FK -> crm_products |
| quantity | integer default 1 |
| unit_value | numeric |
| total_value | numeric |

#### Frontend
- Nova pagina `src/pages/commercial/Products.tsx` com tabela, filtros (categoria, tipo, ativo), dialog criar/editar
- Hook `src/hooks/useProducts.ts`
- Adicionar rota e item no menu lateral
- Vincular produtos a oportunidades no dialog de oportunidade

**Arquivos a criar:** 3 (pagina, hook, dialog de produto)
**Arquivos a modificar:** 3 (App.tsx rotas, DashboardLayout menu, NewOpportunityDialog para vincular produtos)

---

### FASE 3C - Recorrencias e Agendamentos

#### Banco de Dados (migracao)
Nova tabela `crm_recurrence_templates`:
| Campo | Tipo |
|-------|------|
| id | uuid PK |
| company_id | uuid FK |
| product_id | uuid FK -> crm_products (nullable) |
| name | text NOT NULL |
| period_type | text (monthly, quarterly, semiannual, annual) |
| period_value | integer default 1 |
| notification_days_before | integer default 30 |
| description | text |

Nova tabela `crm_client_recurrences`:
| Campo | Tipo |
|-------|------|
| id | uuid PK |
| company_id | uuid FK |
| client_id | uuid FK -> clients |
| template_id | uuid FK -> crm_recurrence_templates (nullable) |
| product_id | uuid FK -> crm_products (nullable) |
| assigned_to | uuid FK -> profiles (nullable) |
| recurrence_type | text |
| periodicity | text |
| next_date | date NOT NULL |
| last_executed_date | date |
| status | text default 'active' |
| estimated_value | numeric |
| notes | text |

#### Frontend
- Pagina `src/pages/commercial/Recurrences.tsx` com calendario visual (mensal) + lista
- Componente `RecurrenceCalendar` mostrando proximas datas
- Dialog para criar/editar recorrencias
- Hook `useRecurrences.ts`

**Arquivos a criar:** 4 (pagina, hook, calendario, dialog)
**Arquivos a modificar:** 2 (App.tsx, DashboardLayout)

---

### FASE 3D - Medicoes de Servicos (integracao)

O modulo de medicoes ja existe no admin. A integracao consiste em:

- Dar acesso de leitura ao role `commercial` nas tabelas de medicoes existentes (RLS)
- Nova pagina `src/pages/commercial/Measurements.tsx` que reutiliza componentes existentes de `src/components/admin/measurements/`
- Filtro por cliente comercial
- Vinculo com oportunidades (campo opcional `opportunity_id` na tabela `measurements`)

**Arquivos a criar:** 1 (pagina)
**Arquivos a modificar:** 2 (App.tsx, DashboardLayout) + migracao RLS

---

### FASE 3E - Relatorios e Business Intelligence

#### Backend (Edge Functions)
3 novas edge functions:
- `generate-executive-dashboard`: Agrega KPIs, gera PDF com recharts server-side ou retorna dados para PDF no client
- `generate-client-dossier`: Compila dados de um cliente (oportunidades, recorrencias, medicoes, historico) em PDF
- `generate-sales-forecast`: Analisa pipeline e projeta receita futura

#### Frontend
- Pagina `src/pages/commercial/Reports.tsx` com 3 tabs (Dashboard Executivo, Dossie do Cliente, Forecast de Vendas)
- Componentes de visualizacao de cada relatorio
- Botao "Gerar PDF" usando `@react-pdf/renderer` (ja instalado)
- Filtros por periodo e cliente

**Arquivos a criar:** 5 (pagina, 3 componentes de relatorio, 1 componente PDF)
**Edge functions:** 3

---

### FASE 3F - Base de Conhecimento

#### Banco de Dados
Nova tabela `crm_knowledge_base`:
| Campo | Tipo |
|-------|------|
| id | uuid PK |
| company_id | uuid FK |
| product_id | uuid FK -> crm_products (nullable) |
| category | text |
| tags | text[] |
| author_id | uuid FK -> profiles |
| published | boolean default true |
| title | text NOT NULL |
| content | text NOT NULL (markdown) |

Nova tabela `crm_reference_documents`:
| Campo | Tipo |
|-------|------|
| id | uuid PK |
| knowledge_base_id | uuid FK (nullable) |
| company_id | uuid FK |
| file_name | text |
| file_url | text |
| file_type | text |
| category | text |

#### Frontend
- Pagina `src/pages/commercial/KnowledgeBase.tsx` com busca, filtros por categoria e tags
- Visualizador de artigos com markdown renderizado
- Upload de documentos via Supabase Storage
- Editor de artigos (textarea markdown com preview)

**Arquivos a criar:** 4 (pagina, editor, viewer, hook)
**Arquivos a modificar:** 2 (App.tsx, DashboardLayout)

---

### FASE 3G - Notificacoes Comerciais

Reutilizar o sistema de notificacoes existente (`notifications`, `NotificationBell`):
- Criar componente `src/components/commercial/NotificationBell.tsx` baseado no existente
- Tipos de notificacao comercial: nova oportunidade, oportunidade proxima de vencer, recorrencia proxima, tarefa pendente
- Edge function `commercial-notifications-check` para verificar e criar alertas automaticamente (cron ou on-demand)
- Integrar o NotificationBell no header do layout comercial

**Arquivos a criar:** 2 (NotificationBell comercial, edge function)
**Arquivos a modificar:** 1 (DashboardLayout para integrar bell)

---

### FASE 3H - Painel Administrativo Comercial

Paginas administrativas acessiveis apenas por admin/super_admin dentro do contexto comercial:

- `src/pages/commercial/admin/Services.tsx` - Gestao de servicos (CRUD crm_products tipo service)
- `src/pages/commercial/admin/Schedules.tsx` - Gestao de agendamentos/templates de recorrencia
- `src/pages/commercial/admin/Import.tsx` - Importacao de dados via CSV/Excel (clientes, oportunidades)
- `src/pages/commercial/admin/Logs.tsx` - Logs de integracao e auditoria

Tabela `crm_integration_logs` para logs.
Utilizar `xlsx` (ja instalado) para importacao.

**Arquivos a criar:** 5 (4 paginas + hook de importacao)
**Arquivos a modificar:** 2 (App.tsx, DashboardLayout com submenu admin)

---

### Resumo de Prioridade e Dependencias

```text
FASE 3A (Refinamentos)         -- sem dependencias, fazer primeiro
  |
FASE 3B (Produtos/Servicos)    -- base para Recorrencias e Medicoes
  |
FASE 3C (Recorrencias)         -- depende de 3B (usa crm_products)
  |
FASE 3D (Medicoes)             -- depende de 3B, reutiliza modulo admin
  |
FASE 3E (Relatorios/BI)        -- depende de 3B, 3C, 3D para dados completos
  |
FASE 3F (Base Conhecimento)    -- independente, pode ser paralela a 3C-3E
  |
FASE 3G (Notificacoes)         -- depende de 3C (alertas de recorrencia)
  |
FASE 3H (Painel Admin)         -- depende de 3B-3G para ter o que administrar
```

### Total Estimado

| Fase | Arquivos novos | Arquivos modificados | Migracoes |
|------|---------------|---------------------|-----------|
| 3A | 0 | 5 | 0 |
| 3B | 3 | 3 | 1 |
| 3C | 4 | 2 | 1 |
| 3D | 1 | 2 | 1 |
| 3E | 5 + 3 edge fns | 1 | 0 |
| 3F | 4 | 2 | 1 |
| 3G | 2 | 1 | 0 |
| 3H | 5 | 2 | 1 |
| **Total** | **~27** | **~18** | **5** |

---

### Recomendacao

Implementar na ordem: **3A -> 3B -> 3C -> 3D -> 3E -> 3F -> 3G -> 3H**, validando cada fase antes de avancar. A Fase 3A pode ser implementada imediatamente pois nao requer migracoes.

