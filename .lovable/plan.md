

## Transformar Feed Corporativo em Rede Social Interna

### Estado Atual
O feed é uma lista simples de cards com título, conteúdo, autor e tipo. Sem interação social (curtidas, comentários), sem criação inline, sem avatar real.

### Novas Funcionalidades

**1. Banco de Dados — Novas tabelas (migração SQL)**

- **`corp_feed_likes`**: `id`, `post_id` (FK → corp_feed_posts), `user_id` (FK → profiles), `created_at`. Unique(post_id, user_id).
- **`corp_feed_comments`**: `id`, `post_id` (FK → corp_feed_posts), `author_id` (FK → profiles), `content` (text), `created_at`, `updated_at`.
- RLS: usuários autenticados da mesma empresa podem ler; cada um pode criar/deletar os próprios likes/comentários.
- Habilitar realtime para ambas as tabelas.

**2. Hook `useCorpFeed.ts` — Expandir**

- Query de posts: incluir contagem de likes (`corp_feed_likes(count)`), contagem de comentários (`corp_feed_comments(count)`), e flag se o usuário atual curtiu.
- Mutations: `likePost`, `unlikePost`, `addComment`, `deleteComment`.

**3. Página `Feed.tsx` — Redesign visual estilo rede social**

- **Criar post inline**: Área no topo com avatar do usuário + textarea "No que você está pensando?" que ao clicar expande com opções de tipo e botão publicar (sem dialog separado).
- **Card de post redesenhado**:
  - Avatar do autor com imagem real (`avatar_url`) via `AvatarImage`.
  - Barra de ações: botão curtir (❤️ com contagem), botão comentar (💬 com contagem), timestamp relativo.
  - Seção de comentários colapsável: lista de comentários com avatar + nome + texto + hora, e input para novo comentário.
  - Posts fixados com destaque visual (ícone pin + borda).
- **Layout centralizado**: max-width ~600px estilo timeline, centrado na página.

**4. Componentes novos**

- **`FeedPostCard.tsx`**: Card individual com autor, conteúdo, ações (like/comment), lista de comentários.
- **`FeedCommentSection.tsx`**: Lista de comentários + input de novo comentário.
- **`FeedCreatePost.tsx`**: Área inline de criação no topo do feed (substitui o dialog para criação rápida; dialog mantido para admins com opções avançadas como fixar).

**5. Detalhes técnicos**

- Contagem de likes via query agregada no select do Supabase (evita N+1).
- Verificação de "já curtiu" comparando `user_id = auth.uid()` no array de likes retornado.
- Comentários carregados junto com o post (limite de 3 visíveis, expandir para ver todos).
- Timestamps relativos usando `formatDistanceToNow` do date-fns.

### Resultado
Feed com aparência de rede social: criação rápida de posts, curtidas com contagem, comentários inline, avatares reais, layout de timeline centralizado.

