

## Planejamento dos Novos Modulos: Suprimentos, Qualidade e Financeiro

### Visao Geral

Tres novos modulos independentes, cada um com roles dedicadas, suas proprias tabelas, rotas e sidebar items. Seguem o mesmo padrao arquitetural dos modulos existentes (HR, Comercial, Corp).

---

### 1. MODULO SUPRIMENTOS (Compras)

**Role:** `compras` (nova role no enum `app_role`)

**Funcionalidades:**
- Solicitacao de Compra: qualquer usuario pode abrir uma solicitacao de material/servico
- Fluxo de aprovacao hierarquico (gerente -> diretoria) reutilizando a logica de alcadas do corp_requests (abordagem hibrida)
- Dashboard com solicitacoes pendentes, aprovadas, em andamento
- Listagem e filtros de solicitacoes de compra
- Painel do comprador para gerenciar solicitacoes aprovadas

**Tabelas no banco de dados:**

| Tabela | Descricao |
|--------|-----------|
| `purchase_requests` | Solicitacoes de compra (solicitante, descricao, itens, valor estimado, status, aprovacoes) |
| `purchase_request_items` | Itens individuais de cada solicitacao (material, quantidade, unidade, valor estimado) |

**Status do fluxo:** `draft` -> `pending_manager` -> `pending_director` (se alcada) -> `approved` -> `in_progress` -> `completed` / `rejected` / `cancelled`

**Paginas:**

| Rota | Pagina |
|------|--------|
| `/supplies/dashboard` | Dashboard com metricas e solicitacoes recentes |
| `/supplies/requests` | Lista de solicitacoes com filtros e busca |
| `/supplies/settings` | Configuracoes do modulo (categorias, limites de alcada) |

**Sidebar items:** Dashboard, Solicitacoes, Configuracoes, Feed, Solicitacoes Corp

**Acesso:** Role `compras` tem acesso total. Outros perfis podem abrir solicitacoes de compra via sistema de solicitacoes corporativas (hibrido).

---

### 2. MODULO QUALIDADE

**Role:** `qualidade` (nova role no enum `app_role`)

**Contexto:** A empresa possui ISO 9001, portanto precisa de rastreabilidade completa e conformidade documental.

**Funcionalidades:**

**a) Registro de Nao-Conformidades (RNC)**
- Abertura com classificacao (interna, externa, fornecedor, processo)
- Evidencias fotograficas (storage)
- Responsavel, prazo e plano de acao corretiva
- Status: `open` -> `analysis` -> `action_plan` -> `verification` -> `closed`

**b) Plano de Acao (PDCA/5W2H)**
- Vinculado a uma RNC ou independente
- Campos: O que, Por que, Onde, Quando, Quem, Como, Quanto
- Verificacao de eficacia com prazo

**c) Auditorias Internas**
- Agendamento com escopo, auditores, auditados
- Checklist de verificacao durante a auditoria
- Registro de achados (conformidade, observacao, nao-conformidade menor/maior)
- Relatorio final

**d) Indicadores de Qualidade (KPIs)**
- Dashboard com metricas: RNCs abertas/fechadas, taxa de retrabalho, eficacia de acoes corretivas, auditorias realizadas vs planejadas

**Tabelas no banco de dados:**

| Tabela | Descricao |
|--------|-----------|
| `quality_ncrs` | Nao-conformidades (tipo, descricao, evidencias, responsavel, status, prazo) |
| `quality_ncr_attachments` | Fotos e documentos vinculados a RNCs |
| `quality_action_plans` | Planos de acao (5W2H), vinculados ou nao a RNCs |
| `quality_action_items` | Itens individuais do plano (o que, quem, quando, status) |
| `quality_audits` | Auditorias agendadas (escopo, data, auditores, status) |
| `quality_audit_findings` | Achados de auditoria (tipo, descricao, evidencia, acao requerida) |
| `quality_audit_checklist_items` | Itens do checklist de auditoria |

**Paginas:**

| Rota | Pagina |
|------|--------|
| `/quality/dashboard` | Dashboard com KPIs e itens pendentes |
| `/quality/ncrs` | Lista de RNCs com filtros |
| `/quality/action-plans` | Planos de acao em andamento |
| `/quality/audits` | Calendario e lista de auditorias |
| `/quality/reports` | Relatorios e indicadores detalhados |
| `/quality/settings` | Configuracoes (categorias de NC, checklists padrao) |

**Sidebar items:** Dashboard, Nao-Conformidades, Planos de Acao, Auditorias, Relatorios, Configuracoes, Feed, Solicitacoes Corp

---

### 3. MODULO FINANCEIRO

**Role:** `financeiro` (nova role no enum `app_role`)

**Contexto:** Futuramente integrado com ERP emissor de NF. Por agora, controle interno.

**Funcionalidades:**

**a) Contas a Pagar**
- Registro de faturas de fornecedores
- Vinculo com ordens de compra (modulo Suprimentos)
- Controle de vencimento, pagamento parcial/total
- Status: `pending` -> `approved` -> `paid` / `overdue`

**b) Contas a Receber**
- Faturamento a clientes, vinculado a medicoes aprovadas
- Acompanhamento de recebimentos
- Status: `invoiced` -> `partial` -> `paid` / `overdue`

**c) Reembolsos**
- Solicitacao com comprovantes (fotos/PDF)
- Aprovacao hierarquica (gerente/diretoria)
- Controle de pagamento

**d) Fluxo de Caixa / DRE Simplificado**
- Visao consolidada de entradas e saidas
- Projecoes baseadas em contas a pagar/receber
- Relatorios por periodo

**Tabelas no banco de dados:**

| Tabela | Descricao |
|--------|-----------|
| `finance_payables` | Contas a pagar (fornecedor, valor, vencimento, status, PO vinculada) |
| `finance_receivables` | Contas a receber (cliente, valor, fatura, medicao vinculada, status) |
| `finance_reimbursements` | Reembolsos (solicitante, valor, comprovantes, status, aprovacoes) |
| `finance_reimbursement_attachments` | Comprovantes anexados a reembolsos |
| `finance_transactions` | Registro de transacoes efetivadas (entrada/saida, data, valor, categoria) |
| `finance_categories` | Categorias de receita/despesa configuráveis por empresa |

**Paginas:**

| Rota | Pagina |
|------|--------|
| `/finance/dashboard` | Dashboard com fluxo de caixa, vencimentos proximos, KPIs |
| `/finance/payables` | Contas a pagar com filtros e acoes |
| `/finance/receivables` | Contas a receber |
| `/finance/reimbursements` | Reembolsos pendentes e historico |
| `/finance/reports` | DRE simplificado, relatorios por periodo |
| `/finance/settings` | Categorias, configuracoes de alerta de vencimento |

**Sidebar items:** Dashboard, Contas a Pagar, Contas a Receber, Reembolsos, Relatorios, Configuracoes, Feed, Solicitacoes Corp

---

### Alteracoes Transversais (compartilhadas)

**1. Novas roles no banco:**
- Adicionar `compras`, `qualidade`, `financeiro` ao enum `app_role`
- Atualizar funcao `has_role` (ja existe e funciona com o enum)

**2. Atualizacao do DashboardLayout:**
- Adicionar userType `compras`, `qualidade`, `financeiro`
- Adicionar arrays de menu para cada novo tipo
- Atualizar cores de gradiente e titulo de cada perfil

**3. Atualizacao do roleRedirect:**
- Adicionar redirecionamentos para `/supplies/dashboard`, `/quality/dashboard`, `/finance/dashboard`

**4. Atualizacao do CorpRoute:**
- Adicionar novas roles no mapeamento `roleToUserType`
- Permitir novas roles no `allowedRoles` do `ProtectedRoute` para acesso ao Feed e Solicitacoes Corp

**5. RLS em todas as tabelas:**
- Todas as tabelas usam `company_id` para isolamento entre empresas
- Acesso controlado por role via funcao `has_role`

---

### Ordem de Implementacao Sugerida

1. ~~**Etapa 1 - Infraestrutura:** Criar novas roles, atualizar DashboardLayout, roleRedirect e CorpRoute~~ ✅ CONCLUÍDA
2. **Etapa 2 - Suprimentos:** Tabelas, paginas, hooks, componentes
3. **Etapa 3 - Qualidade:** Tabelas, paginas, hooks, componentes (mais complexo por causa de RNC + auditorias)
4. **Etapa 4 - Financeiro:** Tabelas, paginas, hooks, componentes + vinculos com Suprimentos e Medicoes

Cada etapa pode ser quebrada em sub-tarefas menores para implementacao incremental.

