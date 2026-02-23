
## Area Administrativa do Modulo Comercial

Baseado nos screenshots de referencia, o modulo comercial precisa de uma area administrativa dedicada com layout e navegacao proprios, separados do CRM principal.

---

### Estrutura da Area Admin

A area administrativa tera seu proprio layout de sidebar com as seguintes paginas:

| Pagina | Rota | Descricao |
|--------|------|-----------|
| Admin Dashboard | `/commercial/admin` | Painel com KPIs (Usuarios Ativos, Servicos Ativos, Lembretes Pendentes, Em Atraso), Atividades Recentes, Acoes Rapidas, Status do Sistema |
| Usuarios | `/commercial/admin/users` | Gestao de usuarios do modulo comercial (listar, criar, editar, ativar/desativar) |
| Servicos | `/commercial/admin/services` | Catalogo de servicos e regras de recorrencia (tabela com Servico, Tipo, Periodicidade, Lead Time, Status) |
| Agendamentos | `/commercial/admin/schedules` | Visao unificada de agendamentos e lembretes com toggle Lista/Calendario e badges de status (Pendente, Agendado, Atrasado) |
| Base de Conhecimento | `/commercial/admin/knowledge` | Versao admin da base de conhecimento com KPI cards (Total Entradas, Documentos, Processados, Chunks), 4 tabs (Entradas, Documentos, Websites, Insights IA), e modal rico para nova entrada |
| Importacao | `/commercial/admin/import` | Ja existente -- sera reaproveitada |
| Logs Integracao | `/commercial/admin/integration-logs` | Ja existente -- sera reaproveitada |
| Logs | `/commercial/admin/logs` | Log de auditoria geral do modulo |

---

### Componentes a Criar

**1. Layout Admin Comercial** (`src/components/commercial/admin/CommercialAdminLayout.tsx`)
- Sidebar propria com navegacao das paginas admin
- Botao "Voltar ao CRM" no topo que redireciona para `/commercial/dashboard`
- Header "Admin Panel" com avatar e subtitulo "Administracao"
- Barra de busca global no topo

**2. Admin Dashboard** (`src/pages/commercial/admin/Dashboard.tsx`)
- 4 KPI cards: Usuarios Ativos, Servicos Ativos, Lembretes Pendentes, Em Atraso (com indicadores de variacao)
- Card "Atividades Recentes" com timeline de eventos (logs do crm_integration_logs)
- Card "Acoes Rapidas" com links: Gerenciar Usuarios, Configurar Servicos, Ver Agendamentos, Logs de Auditoria
- Secao "Status do Sistema" com metricas estaticas (Disponibilidade, Tempo de Resposta, Armazenamento, Eventos Hoje)

**3. Usuarios Admin** (`src/pages/commercial/admin/Users.tsx`)
- Tabela de usuarios filtrados por company_id com role commercial
- Acoes: criar, editar, ativar/desativar (reutiliza hooks existentes de useAllUsers adaptado ao contexto da empresa)

**4. Servicos e Recorrencias** (`src/pages/commercial/admin/Services.tsx`)
- Tabela baseada em crm_products com colunas: Servico, Tipo (badge colorido), Periodicidade Padrao, Lead Time (dias), Status, Acoes
- Busca por nome ou tipo
- Botao "+ Novo Servico" que reutiliza o dialog de Products com campos extras (periodicidade, lead_time)

**5. Agendamentos e Lembretes** (`src/pages/commercial/admin/Schedules.tsx`)
- Lista de recorrencias proximas de vencer (dados de crm_client_recurrences)
- Cada item mostra: tipo + cliente, data de vencimento, responsavel, status (Pendente/Agendado/Atrasado)
- Toggle Lista/Calendario
- Botao "Ver" para abrir detalhes

**6. Base de Conhecimento Admin** (`src/pages/commercial/admin/Knowledge.tsx`)
- Redesign da pagina existente com layout da referencia:
  - 4 KPI cards no topo (Total de Entradas, Documentos, Processados, Chunks Gerados)
  - Barra de busca ampla
  - 4 tabs: Entradas de Conhecimento, Documentos, Websites, Insights da IA
  - Botoes no header: Adicionar Website, Upload Documento, + Nova Entrada
  - Modal "Nova Entrada de Conhecimento" com layout 2 colunas (Titulo/Conteudo, Categoria/Tags, Segmento Alvo/Versao, Prioridade/Observacoes, Produto Relacionado)

**7. Logs de Auditoria** (`src/pages/commercial/admin/AuditLogs.tsx`)
- Timeline de acoes do sistema filtrada pela empresa

---

### Migracao de Banco

Adicionar coluna `lead_time_days` (integer, default 30) na tabela `crm_products` para suportar o campo "Lead Time" dos servicos.

---

### Rotas a Adicionar no App.tsx

Novas rotas sob `/commercial/admin/*`:
- `/commercial/admin` (Dashboard)
- `/commercial/admin/users`
- `/commercial/admin/services`
- `/commercial/admin/schedules`
- `/commercial/admin/knowledge`
- `/commercial/admin/import` (reutiliza pagina existente)
- `/commercial/admin/integration-logs` (reutiliza pagina existente)
- `/commercial/admin/logs`

Todas protegidas com `allowedRoles={['commercial', 'admin']}`.

---

### Sidebar do CRM Principal

Adicionar item "Admin" na sidebar do commercial (`DashboardLayout.tsx`) com icone de engrenagem, apontando para `/commercial/admin`.

---

### Detalhes Tecnicos

**CommercialAdminLayout:** Wrapper que substitui o DashboardLayout padrao com sidebar propria. Recebe `children` e renderiza sidebar fixa a esquerda com os menu items admin. O botao "Voltar ao CRM" usa `navigate('/commercial/dashboard')`.

**Dashboard KPIs:** Queries ao banco:
- Usuarios Ativos: `profiles` filtrado por `company_id` com role `commercial`
- Servicos Ativos: `crm_products` com `active = true`
- Lembretes Pendentes: `crm_client_recurrences` com `next_date` nos proximos 30 dias
- Em Atraso: `crm_client_recurrences` com `next_date < hoje` e status `active`

**Atividades Recentes:** Query em `crm_integration_logs` ordenado por `created_at DESC`, limite 10.

**Ordem de implementacao:**
1. Migracao (lead_time_days)
2. CommercialAdminLayout
3. Admin Dashboard
4. Pagina de Usuarios
5. Pagina de Servicos
6. Pagina de Agendamentos
7. Base de Conhecimento Admin
8. Logs de Auditoria
9. Rotas no App.tsx + item na sidebar
