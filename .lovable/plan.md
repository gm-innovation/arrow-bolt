

## Modulo: Requisicoes, Comunicacao e Gestao Corporativa

Este e um modulo grande que sera implementado em **4 fases** para manter a estabilidade do sistema.

---

### FASE 1: Banco de Dados e Infraestrutura

#### 1.1 Novo Perfil: Diretoria

Adicionar `director` ao enum `app_role`:

```text
ALTER TYPE app_role ADD VALUE 'director';
```

Atualizar `roleRedirects` em `src/lib/roleRedirect.ts` para incluir `director: "/corp/dashboard"`.

#### 1.2 Novas Tabelas

**departments** - Departamentos da empresa

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK companies | |
| name | text NOT NULL | |
| description | text | |
| manager_id | uuid FK profiles | Gerente responsavel |
| active | boolean DEFAULT true | |
| created_at | timestamptz | |

**corp_request_types** - Tipos de requisicao

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK companies | |
| name | text NOT NULL | |
| department_id | uuid FK departments | |
| requires_approval | boolean DEFAULT false | |
| requires_director_approval | boolean DEFAULT false | |
| director_threshold_value | numeric | Valor acima do qual exige diretoria |
| dynamic_fields | jsonb | Campos dinamicos do formulario |
| active | boolean DEFAULT true | |
| created_at / updated_at | timestamptz | |

**corp_requests** - Requisicoes

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK companies | |
| title | text NOT NULL | |
| description | text | |
| priority | text DEFAULT 'medium' | low/medium/high/urgent |
| amount | numeric | Para compras |
| status | text DEFAULT 'open' | open/pending_manager/pending_director/approved/rejected/cancelled/completed |
| department_id | uuid FK departments | |
| type_id | uuid FK corp_request_types | |
| requester_id | uuid FK profiles | |
| manager_approver_id | uuid FK profiles | |
| manager_approved_at | timestamptz | |
| director_approver_id | uuid FK profiles | |
| director_approved_at | timestamptz | |
| rejection_reason | text | |
| dynamic_data | jsonb | Dados dos campos dinamicos |
| created_at / updated_at | timestamptz | |

**corp_request_attachments** - Anexos de requisicoes

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| request_id | uuid FK corp_requests | |
| file_name | text NOT NULL | |
| file_url | text NOT NULL | |
| file_size | integer | |
| uploaded_by | uuid FK profiles | |
| created_at | timestamptz | |

**corp_documents** - Documentos corporativos

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK companies | |
| owner_user_id | uuid FK profiles | Destinatario do doc |
| related_request_id | uuid FK corp_requests | Nullable |
| document_type | text NOT NULL | payslip/benefits/declaration/institutional/medical_certificate/reimbursement_proof/signed_form/other |
| title | text NOT NULL | |
| file_name | text NOT NULL | |
| file_url | text NOT NULL | |
| uploaded_by | uuid FK profiles | |
| visibility_level | text DEFAULT 'private' | private/department/global |
| created_at | timestamptz | |

**corp_feed_posts** - Feed de comunicacao interna

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK companies | |
| author_id | uuid FK profiles | |
| title | text | |
| content | text NOT NULL | |
| post_type | text DEFAULT 'announcement' | announcement/update/general |
| pinned | boolean DEFAULT false | |
| created_at / updated_at | timestamptz | |

**corp_audit_log** - Log de auditoria do modulo

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK companies | |
| user_id | uuid FK profiles | |
| action | text NOT NULL | Ex: request_created, manager_approved, director_approved, document_uploaded |
| entity_type | text | request/document/feed |
| entity_id | uuid | |
| details | jsonb | |
| created_at | timestamptz | |

#### 1.3 Storage Bucket

Criar bucket `corp-documents` para arquivos do modulo.

#### 1.4 RLS Policies

Todas as tabelas terao RLS habilitado com policies baseadas em `company_id` e `user_id`:
- Usuarios veem suas proprias requisicoes e documentos privados
- Gerentes veem requisicoes do departamento que gerenciam
- RH e Admin veem tudo da empresa
- Diretoria ve todas requisicoes mas NAO documentos privados (exceto status)
- Funcao `user_company_id()` existente sera reutilizada para isolar por empresa

#### 1.5 Notification Types

Adicionar novos tipos ao enum `notification_type`:
- `request_created`
- `request_approved`
- `request_rejected`
- `document_received`
- `approval_pending`

---

### FASE 2: Hooks e Logica de Negocio

#### 2.1 Hooks principais

| Hook | Funcionalidade |
|------|----------------|
| `useCorpRequests` | CRUD de requisicoes + filtros por status/departamento/tipo |
| `useCorpRequestTypes` | CRUD de tipos de requisicao (admin) |
| `useDepartments` | CRUD de departamentos (admin) |
| `useCorpDocuments` | Upload/listagem de documentos + filtros por tipo/visibilidade |
| `useCorpFeed` | CRUD de posts do feed |
| `useCorpAuditLog` | Leitura de logs de auditoria |
| `useCorpDashboard` | Estatisticas agregadas para dashboards |
| `useApprovalFlow` | Logica de aprovacao multinivel |

#### 2.2 Logica de Aprovacao

```text
Ao criar requisicao:
  1. Buscar tipo da requisicao
  2. IF !requires_approval -> status = "open"
  3. IF requires_approval AND !requires_director_approval:
     - IF amount <= director_threshold_value OR threshold is null -> status = "pending_manager"
     - ELSE -> status = "pending_manager" (diretoria apos)
  4. IF requires_director_approval -> status = "pending_manager"

Ao gerente aprovar:
  - IF tipo requires_director_approval OR amount > threshold -> status = "pending_director"
  - ELSE -> status = "approved"

Ao diretor aprovar:
  - status = "approved"
```

---

### FASE 3: Paginas e Componentes de UI

O modulo tera rotas sob `/corp/` acessiveis por TODOS os perfis (cada um com permissoes diferentes).

#### 3.1 Rotas

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/corp/dashboard` | CorpDashboard | Todos |
| `/corp/requests` | CorpRequests | Todos |
| `/corp/requests/new` | NewRequest | Todos |
| `/corp/documents` | CorpDocuments | Todos (filtrado por permissao) |
| `/corp/feed` | CorpFeed | Todos |
| `/corp/admin/departments` | DepartmentsAdmin | Admin |
| `/corp/admin/request-types` | RequestTypesAdmin | Admin |
| `/corp/admin/users` | CorpUsersAdmin | Admin |
| `/corp/admin/audit-log` | AuditLogViewer | Admin + Diretoria (parcial) |
| `/corp/reports` | CorpReports | RH + Admin + Diretoria |

#### 3.2 Componentes Principais

**Dashboard (varia por perfil):**
- Usuario: Minhas requisicoes recentes + meus documentos + feed
- Gerente: Pendentes de aprovacao + stats do departamento + feed
- RH: Documentos pendentes + stats globais + feed
- Diretoria: KPIs executivos (total requisicoes, volume financeiro, SLA, pendentes diretoria, grafico por departamento)
- Admin: Visao completa + gestao

**Requisicoes:**
- Listagem com filtros (status, tipo, departamento, periodo)
- Dialog/Sheet para nova requisicao com campos dinamicos baseados no tipo
- Sheet de detalhes com timeline de aprovacao
- Botoes de aprovar/rejeitar (visivel conforme permissao)

**Documentos:**
- 2 abas: "Meus Documentos" e "Documentos Recebidos"
- Upload com categoria e vinculo opcional a requisicao
- RH: aba extra "Enviar para Colaborador"

**Feed:**
- Lista de posts com autor, data, badge de tipo
- RH/Admin podem criar posts e fixar

#### 3.3 Integracao com Sidebar

O `DashboardLayout` recebera um novo `userType` ou sera adaptado para exibir um item "Corporativo" na sidebar de TODOS os perfis, linkando para `/corp/dashboard`. Alternativa: adicionar as rotas `/corp/*` como submenu em cada sidebar existente.

**Abordagem escolhida:** Adicionar item "Corporativo" na sidebar de todos os perfis existentes. Ao clicar, navega para `/corp/dashboard` onde um layout interno com sub-navegacao propria (tabs ou sidebar interna) gerencia as paginas do modulo.

#### 3.4 Layout do Modulo Corporativo

O modulo tera seu proprio layout com tabs horizontais:

```text
+------------------------------------------+
| Corporativo                              |
| [Dashboard] [Requisicoes] [Documentos]   |
| [Feed] [Relatorios] [Admin]             |
+------------------------------------------+
| Conteudo da tab ativa                    |
+------------------------------------------+
```

As tabs visiveis variam conforme o perfil do usuario.

---

### FASE 4: Aprovacoes, Notificacoes e Auditoria

#### 4.1 Triggers de Notificacao

- Ao criar requisicao com aprovacao: notificar gerente do departamento
- Ao gerente aprovar com necessidade de diretoria: notificar diretores da empresa
- Ao aprovar/rejeitar: notificar solicitante
- Ao RH enviar documento: notificar destinatario

#### 4.2 Triggers de Auditoria

Inserir em `corp_audit_log` automaticamente via triggers em:
- `corp_requests` (INSERT, UPDATE de status)
- `corp_documents` (INSERT, DELETE)
- `corp_feed_posts` (INSERT)

#### 4.3 Dashboard Executivo (Diretoria)

Cards com:
- Total de solicitacoes no periodo
- Total de compras aprovadas
- Volume financeiro aprovado (soma de `amount` das aprovadas)
- Solicitacoes pendentes de diretoria (badge vermelho)
- Grafico de barras por departamento
- Indicador de SLA (tempo medio de aprovacao)

---

### Resumo de Arquivos a Criar

| Tipo | Caminho |
|------|---------|
| Migracao | Schema completo (7 tabelas + enum updates + RLS + triggers + storage) |
| Hook | `src/hooks/useCorpRequests.ts` |
| Hook | `src/hooks/useCorpRequestTypes.ts` |
| Hook | `src/hooks/useDepartments.ts` |
| Hook | `src/hooks/useCorpDocuments.ts` |
| Hook | `src/hooks/useCorpFeed.ts` |
| Hook | `src/hooks/useCorpAuditLog.ts` |
| Hook | `src/hooks/useCorpDashboard.ts` |
| Pagina | `src/pages/corp/Dashboard.tsx` |
| Pagina | `src/pages/corp/Requests.tsx` |
| Pagina | `src/pages/corp/Documents.tsx` |
| Pagina | `src/pages/corp/Feed.tsx` |
| Pagina | `src/pages/corp/Reports.tsx` |
| Pagina | `src/pages/corp/admin/Departments.tsx` |
| Pagina | `src/pages/corp/admin/RequestTypes.tsx` |
| Pagina | `src/pages/corp/admin/AuditLog.tsx` |
| Componente | `src/components/corp/NewRequestDialog.tsx` |
| Componente | `src/components/corp/RequestDetailSheet.tsx` |
| Componente | `src/components/corp/ApprovalActions.tsx` |
| Componente | `src/components/corp/DocumentUploadDialog.tsx` |
| Componente | `src/components/corp/FeedPostDialog.tsx` |
| Componente | `src/components/corp/CorpLayout.tsx` (tabs de navegacao interna) |
| Componente | `src/components/corp/dashboard/CorpStats.tsx` |
| Componente | `src/components/corp/dashboard/DirectorDashboard.tsx` |
| Modificar | `src/App.tsx` (adicionar rotas /corp/*) |
| Modificar | `src/components/DashboardLayout.tsx` (adicionar item Corporativo em todas as sidebars) |
| Modificar | `src/lib/roleRedirect.ts` (adicionar director) |
| Modificar | `src/components/ProtectedRoute.tsx` (permitir director) |

### Ordem de Implementacao

Dado o tamanho, a implementacao sera feita em etapas dentro de mensagens separadas:

1. **Etapa 1:** Migracao de banco (todas as tabelas, enums, RLS, triggers, storage)
2. **Etapa 2:** Hooks de dados + CorpLayout + rotas + sidebar
3. **Etapa 3:** Paginas de Dashboard, Requisicoes (com fluxo de aprovacao), e Feed
4. **Etapa 4:** Paginas de Documentos, Relatorios, Admin (departamentos, tipos), Auditoria

