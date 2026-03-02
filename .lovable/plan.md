

## Correções no Sistema de Grupos

### Problema 1: Página interna do grupo inexistente
Ao clicar em um grupo (na sidebar esquerda ou na página de grupos), o usuário é redirecionado para `/corp/groups` que é apenas uma listagem. Não existe uma página de detalhe do grupo com feed/membros.

### Problema 2: Entrada automática sem aprovação
Atualmente, ao clicar "Entrar", o usuário é inserido diretamente na tabela `corp_group_members`. Deveria haver um fluxo de solicitação com aprovação por admin/HR.

---

### Alterações

**1. Banco de dados — Nova tabela `corp_group_join_requests`**
- Campos: `id`, `group_id`, `user_id`, `status` (pending/approved/rejected), `requested_at`, `reviewed_by`, `reviewed_at`
- RLS: usuário pode inserir request com seu `user_id`, admin/HR podem atualizar status
- Trigger: ao aprovar, inserir automaticamente em `corp_group_members`

**2. Nova página `/corp/groups/:id` — Detalhe do Grupo**
- Criar `src/pages/corp/GroupDetail.tsx`
- Mostra nome, descrição, lista de membros com avatar
- Se o usuário é membro: mostra feed/conteúdo do grupo (inicialmente lista de membros)
- Se não é membro: mostra botão "Solicitar Entrada"
- Rota no `App.tsx`: `/corp/groups/:id`

**3. Atualizar `useCorpGroups.ts`**
- Substituir `joinGroup` por `requestJoin` que insere em `corp_group_join_requests` com status `pending`
- Adicionar query de `pendingRequests` para admins/HR visualizarem
- Adicionar mutations `approveRequest` e `rejectRequest`

**4. Atualizar `FeedRightSidebar.tsx`**
- Botão "Entrar" vira "Solicitar" para grupos custom
- Mostrar badge "Pendente" se já existe solicitação pendente
- Clicar no nome do grupo navega para `/corp/groups/:id`

**5. Atualizar `FeedProfileSidebar.tsx`**
- Clicar no badge do grupo navega para `/corp/groups/:id` (buscar group_id na query)

**6. Atualizar `CorpLayout.tsx`**
- Manter aba "Grupos" apontando para `/corp/groups` (listagem geral)

**7. Atualizar `Groups.tsx`**
- Cards clicáveis navegam para `/corp/groups/:id`
- Botão "Entrar" vira "Solicitar" e cria request pendente
- Para admin/HR: mostrar badge com contagem de solicitações pendentes por grupo

**8. Painel de aprovação (dentro de GroupDetail)**
- Admin/HR veem lista de solicitações pendentes com botões Aprovar/Rejeitar

