

## Plano: Remover página Grupos, Discussões no Feed, Reações, Enquetes, Aniversariantes e Kudos

### 1. Remover página/aba "Grupos"
- Remover aba "Grupos" do `CorpLayout.tsx` (linha 26)
- Remover rota `/corp/groups` do `App.tsx` (manter `/corp/groups/:id` e `/corp/groups/:id/discussions/:discussionId`)
- Deletar `src/pages/corp/Groups.tsx`

### 2. Discussões gerais no Feed (coluna esquerda)
Na sidebar esquerda (`FeedProfileSidebar.tsx`), abaixo dos grupos, adicionar seção **"Discussões"** com botão "Nova Discussão". Discussões gerais são abertas a todos da empresa (não vinculadas a um grupo).

**Banco de dados:** Reutilizar `corp_group_discussions` adicionando coluna `company_id` (nullable) — quando `group_id` é null e `company_id` preenchido, é uma discussão geral do feed. Ou criar tabela separada `corp_feed_discussions` com campos similares e `corp_feed_discussion_posts` para respostas.

Decisão: criar **`corp_feed_discussions`** (id, company_id, author_id, title, content, pinned, created_at) e **`corp_feed_discussion_replies`** (id, discussion_id, author_id, content, created_at) para manter separação clara. RLS: mesma empresa pode ler/criar. Nova rota `/corp/feed/discussions/:id`.

- `FeedProfileSidebar.tsx`: listar últimas 5 discussões gerais com título truncado + link. Botão "Nova Discussão" abre dialog
- Nova página `src/pages/corp/FeedDiscussion.tsx` com layout 3 colunas: sidebar esquerda (perfil), centro (tópico + respostas), direita (aniversariantes/grupos)

### 3. Reações variadas (substituir curtida simples)

**Banco de dados:** Adicionar coluna `reaction_type` (text, default 'like') na `corp_feed_likes`. Alterar unique constraint de `(post_id, user_id)` para `(post_id, user_id, reaction_type)` — ou manter uma reação por usuário e mudar o tipo. Decisão: **uma reação por usuário por post**, coluna `reaction_type` (like, love, celebrate, support, funny, insightful).

- `FeedPostCard.tsx`: substituir botão "Curtir" por popover de reações (emoji picker com 6 opções tipo LinkedIn)
- Mostrar contagem agrupada por tipo de reação

### 4. Enquetes

**Banco de dados:** 
- `corp_feed_polls` (id, post_id FK, question, allow_multiple, ends_at)
- `corp_feed_poll_options` (id, poll_id FK, option_text, position)
- `corp_feed_poll_votes` (id, option_id FK, user_id, created_at, unique user_id+poll_id via trigger)

- `FeedCreatePost.tsx`: adicionar botão "Enquete" que expande campos para pergunta + opções
- `FeedPostCard.tsx`: renderizar enquete inline com barras de progresso e porcentagens
- Após votar, mostrar resultados; antes, mostrar opções clicáveis

### 5. Card de aniversariantes no feed
Gerar automaticamente um post especial de aniversário no feed central quando for o dia do aniversário de alguém. Pode ser feito client-side: verificar se há aniversariante do dia e renderizar um card especial no topo do feed (sem criar post real no banco).

- Componente `BirthdayCard` renderizado no feed central acima dos posts, mostrando quem faz aniversário hoje com visual festivo

### 6. Kudos
Sistema de reconhecimento entre colegas.

**Banco de dados:**
- `corp_kudos` (id, company_id, from_user_id, to_user_id, category (teamwork/innovation/leadership/helpfulness/excellence), message, created_at)

- `FeedCreatePost.tsx`: botão "Kudos" abre dialog para selecionar colega + categoria + mensagem
- Kudos aparecem como posts especiais no feed com visual diferenciado (ícone de troféu, destaque do destinatário)
- `FeedRightSidebar.tsx`: card "Top Kudos" mostrando quem mais recebeu reconhecimentos no mês

### Resumo de migrações SQL
1. `corp_feed_discussions` + `corp_feed_discussion_replies` + RLS
2. Alterar `corp_feed_likes`: add `reaction_type text default 'like'`, drop/recreate unique constraint
3. `corp_feed_polls` + `corp_feed_poll_options` + `corp_feed_poll_votes` + RLS
4. `corp_kudos` + RLS

### Componentes novos/alterados
- Deletar: `src/pages/corp/Groups.tsx`
- Alterar: `CorpLayout.tsx`, `App.tsx`, `FeedProfileSidebar.tsx`, `FeedPostCard.tsx`, `FeedCreatePost.tsx`, `FeedRightSidebar.tsx`, `useCorpFeed.ts`
- Criar: `FeedDiscussion.tsx` (página), `FeedReactionPicker.tsx`, `FeedPollCreate.tsx`, `FeedPollDisplay.tsx`, `FeedBirthdayCard.tsx`, `FeedKudosDialog.tsx`, `FeedKudosCard.tsx`, `useCorpFeedDiscussions.ts`

