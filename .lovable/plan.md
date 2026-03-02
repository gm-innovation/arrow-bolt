

## Página de Grupo como Fórum com Layout 3 Colunas

### Estrutura

A página de detalhe do grupo (`/corp/groups/:id`) será reestruturada com o mesmo layout de 3 colunas do feed principal, e o conteúdo central funcionará como um fórum com discussões/tópicos.

### Banco de Dados — 2 novas tabelas

**`corp_group_discussions`** — Tópicos/assuntos do fórum
- `id`, `group_id` (FK corp_groups), `author_id` (FK profiles), `title`, `content`, `pinned`, `created_at`, `updated_at`
- RLS: membros do grupo podem ler; membros podem criar; autor pode editar/deletar

**`corp_group_discussion_posts`** — Respostas dentro de cada discussão (feed interno)
- `id`, `discussion_id` (FK corp_group_discussions), `author_id` (FK profiles), `content`, `created_at`
- RLS: membros do grupo podem ler e criar; autor pode deletar

### Página `GroupDetail.tsx` — Layout 3 colunas

**Coluna esquerda (260px):** Card com info do grupo (nome, tipo, descrição, badge de membros, botão Sair/Solicitar, e painel de aprovação para admin/HR)

**Coluna central:** Lista de discussões do grupo. Cada discussão mostra título, autor, data, e contagem de respostas. Botão "Nova Discussão" no topo. Ao clicar em uma discussão, abre a página de discussão.

**Coluna direita (260px):** Lista de membros do grupo com avatares

### Nova Página `GroupDiscussion.tsx` — `/corp/groups/:id/discussions/:discussionId`

Layout 3 colunas igual. A coluna central mostra o post original da discussão no topo e abaixo um feed de respostas (como posts do feed principal), com campo para responder. Colunas laterais iguais à página do grupo.

### Novo hook `useGroupDiscussions.ts`
- Queries: listar discussões do grupo, listar posts de uma discussão
- Mutations: criar discussão, criar resposta, deletar

### Rota no `App.tsx`
- `/corp/groups/:id/discussions/:discussionId` → `GroupDiscussion.tsx`

### Componentes novos
- `GroupInfoSidebar.tsx` — Sidebar esquerda com info do grupo (extraído do GroupDetail atual)
- `GroupMembersSidebar.tsx` — Sidebar direita com lista de membros
- `NewDiscussionDialog.tsx` — Dialog para criar nova discussão (título + conteúdo)

