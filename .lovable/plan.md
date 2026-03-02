

## Plano: Enquetes na sidebar, enquete única ativa, badges automáticas substituindo Kudos

### 1. Enquetes — Mover para sidebar esquerda + regra de uma por vez

**FeedProfileSidebar.tsx**: Adicionar seção "Enquete" com botão para criar nova enquete (abre dialog). Se já existe enquete ativa, mostrar a enquete inline com votação (reutilizar FeedPollDisplay). Se não há enquete ativa, mostrar botão "Nova Enquete" (só para admin/HR).

**Regra de negócio**: Só pode existir uma enquete ativa por empresa. Ao criar nova, verificar se não há outra ativa. Adicionar coluna `status` (text, default 'active') e `closed_at` (timestamptz, nullable) na tabela `corp_feed_polls`. Admin/HR podem finalizar a enquete ativa antes de criar uma nova.

**Feed central**: Enquetes ativas (post com poll) ficam fixadas no topo do feed (setar `pinned = true` ao criar post de enquete, e `pinned = false` ao finalizar).

**Remover**: Botão "Enquete" do `FeedCreatePost.tsx`.

### 2. Badges automáticas substituindo Kudos

**Banco de dados**: 
- Nova tabela `corp_badges` (id, company_id, user_id, badge_type text, title text, description text, icon text, awarded_at timestamptz, awarded_by uuid FK profiles)
- Badge types: 'tenure_1y', 'tenure_5y', 'tenure_10y', 'goal_achieved', 'project_completed', 'course_completed', 'custom'
- RLS: mesma empresa pode ler; admin/HR podem inserir

**Remover**: 
- Tabela `corp_kudos` (ou deixar, mas remover referências no código)
- `FeedKudosDialog.tsx` — deletar
- `FeedKudosCard.tsx` — substituir por `FeedBadgesCard.tsx`
- Remover botão "Kudos/Reconhecer" do `FeedCreatePost.tsx`

**FeedRightSidebar.tsx**: Substituir `FeedKudosCard` por `FeedBadgesCard` mostrando badges recentes concedidas na empresa.

**FeedBadgesCard.tsx**: Card "Conquistas Recentes" listando últimas badges concedidas com ícone, nome do usuário e título da badge.

**Admin/HR**: Na sidebar esquerda ou em um dialog acessível, permitir conceder badge a um colaborador (selecionar usuário, tipo, título, descrição). Componente `AwardBadgeDialog.tsx`.

### 3. Correções de overflow no FeedCreatePost

- Adicionar `overflow-hidden` e `min-w-0` no container flex-1
- Botões de ação com `flex-wrap` adequado

### Migrações SQL
1. Alterar `corp_feed_polls`: add `status text default 'active'`, `closed_at timestamptz`
2. Criar `corp_badges` com RLS

### Arquivos
- **Alterar**: `FeedCreatePost.tsx` (remover enquete e kudos, fix overflow), `FeedProfileSidebar.tsx` (adicionar seção enquete), `FeedRightSidebar.tsx` (trocar kudos por badges), `useCorpFeed.ts` (lógica de pinned ao criar enquete)
- **Criar**: `FeedBadgesCard.tsx`, `AwardBadgeDialog.tsx`, `FeedPollSidebarCreate.tsx` (dialog de criação de enquete na sidebar)
- **Deletar**: `FeedKudosDialog.tsx`, `FeedKudosCard.tsx`

