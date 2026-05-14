## Objetivo

Permitir que o coordenador, dentro de uma oportunidade em `/admin/opportunities`, **(a) envie diretamente para outro coordenador** (reatribuição imediata) **ou (b) solicite uma transferência** que precisa ser aprovada pelo destinatário (ou pelo diretor) antes de efetivar.

## Mudanças

### 1. Banco — nova tabela `crm_opportunity_transfers` (migração)

Campos de domínio:
- `opportunity_id` (FK `crm_opportunities`, cascade)
- `from_user_id` (coordenador atual / solicitante)
- `to_user_id` (coordenador destino)
- `reason` (texto opcional — justificativa)
- `status`: `pending` | `accepted` | `rejected` | `cancelled` | `auto` (auto = envio direto, já efetivado)
- `decided_by`, `decided_at`, `decision_note`
- `company_id` (multi-tenant)

RLS:
- SELECT: usuários da mesma empresa que sejam o `from_user_id`, `to_user_id`, ou tenham role `coordinator` / `director` / `admin` / `super_admin`.
- INSERT: o próprio `from_user_id` autenticado, com role `coordinator` / `director`.
- UPDATE (aceitar/rejeitar/cancelar): apenas `to_user_id` (aceitar/rejeitar) ou `from_user_id` (cancelar enquanto `pending`), ou `director`.

Trigger ao mudar `status` para `accepted`: atualizar `crm_opportunities.assigned_to = to_user_id` e registrar entrada em `crm_opportunity_activities` (`activity_type = 'note'`, descrição "Transferência aceita por …").

Para envio direto (botão "Enviar agora"): criar registro com `status = 'auto'` já refletindo a reatribuição (atualização imediata de `assigned_to`).

Notificações: inserir em `notifications` para o destinatário quando uma transferência `pending` é criada e para o solicitante quando ela é decidida.

### 2. Hook novo `src/hooks/useOpportunityTransfers.ts`
- `useOpportunityTransfers(opportunityId?)` — lista transferências da oportunidade.
- `useMyPendingTransfers()` — pendentes onde sou `to_user_id` (para indicador na UI futura).
- Mutations: `requestTransfer({ opportunityId, toUserId, reason })`, `sendDirect({ opportunityId, toUserId, reason })`, `acceptTransfer(id, note?)`, `rejectTransfer(id, note?)`, `cancelTransfer(id)`.
- Invalidações: `["opportunities"]`, `["opportunity-transfers", opportunityId]`, `["my-pending-transfers"]`.

### 3. UI — `EditOpportunitySheet`
Adicionar uma nova aba **"Transferência"** (visível apenas quando `!readOnly` e `segment !== 'product'`):
- Bloco "Reatribuir":
  - Select de coordenadores da empresa (reusar `useCompanyUsers(["coordinator","director"])`, excluindo o atual).
  - Campo de motivo (opcional).
  - Dois botões: **Enviar agora** (reatribui imediatamente, status `auto`) e **Solicitar transferência** (status `pending`, aguarda aceite).
- Bloco "Histórico de transferências": lista as transferências da oportunidade com status, datas, solicitante e destinatário; quando o usuário atual for o destinatário de uma `pending`, mostra botões **Aceitar** / **Recusar** (com campo opcional de nota); quando for o solicitante, mostra **Cancelar**.
- Toasts de feedback e fechamento/refresh do painel após reatribuição efetiva.

### 4. Página `/admin/opportunities`
- Nenhuma mudança estrutural — após `onSave`/aceite de transferência, o `load()` existente já recarrega.
- Acrescentar pequeno badge no card quando houver transferência `pending` envolvendo o usuário atual ("Transferência pendente").

### 5. Escopo / não-objetivos
- Sem mexer em Comercial/Marketing (segment = product permanece somente leitura).
- Sem alterar criação de OS, filtros, kanban ou RLS de `crm_opportunities`.
- Sem fluxo de aprovação por diretor além do já contemplado (diretor pode atuar via UPDATE pelas RLS).

## Resultado
Coordenador abre a oportunidade, vai na aba **Transferência**, escolhe um colega e decide entre **enviar direto** ou **solicitar aprovação**. O destinatário vê a solicitação pendente na própria oportunidade (e via notificação) e pode aceitar/recusar; ao aceitar, a oportunidade muda de dono automaticamente e fica registrada no histórico.