

## Substituir Post Type por Sistema de Menções (@)

### O que muda

1. **Remover** o seletor de tipo de post (Geral/Comunicado/Atualização) do `FeedCreatePost` e o badge de tipo do `FeedPostCard`.

2. **Criar tabela `corp_feed_mentions`** (migração SQL):
   - `id`, `post_id` (FK → corp_feed_posts), `mention_type` (enum: 'role' | 'user'), `mention_value` (text — role slug ou user_id), `display_name` (text), `created_at`
   - RLS: leitura para autenticados, inserção pelo autor do post

3. **Criar componente `FeedMentionInput.tsx`**:
   - Textarea customizada que detecta digitação de `@` e abre um popover/dropdown com:
     - **Grupos (roles)**: Técnicos, Administradores, RH, Gerentes, Comercial, Qualidade, Suprimentos, Financeiro
     - **Usuários individuais**: busca por nome nos profiles da mesma empresa
   - Ao selecionar, insere `@NomeDoGrupo` ou `@NomeDoUsuário` no texto com formatação destacada
   - Retorna lista de menções estruturadas (tipo + valor) junto com o conteúdo

4. **Atualizar `FeedCreatePost.tsx`**:
   - Substituir `Textarea` + `Select` pelo novo `FeedMentionInput`
   - Ao publicar, salvar as menções na tabela `corp_feed_mentions`
   - Remover estado `postType`

5. **Atualizar `FeedPostCard.tsx`**:
   - Remover badge de tipo de post
   - Renderizar menções no conteúdo com destaque visual (badges coloridos inline para `@Grupo` e `@Pessoa`)
   - Se o post tem menções de grupo, mostrar um indicador sutil (ex: "Direcionado a @Técnicos")

6. **Atualizar `useCorpFeed.ts`**:
   - Incluir `corp_feed_mentions` no select dos posts
   - Atualizar `createPost` para aceitar e salvar menções
   - Buscar profiles e roles para o autocomplete de menções

### Mapeamento de roles para nomes de exibição
- `technician` → Técnicos
- `admin` → Administradores
- `hr` → RH
- `manager` → Gerentes
- `compras` → Suprimentos
- `qualidade` → Qualidade
- `financeiro` → Financeiro
- `super_admin` → Super Admin

### Resultado
Posts sem categorização fixa. Em vez disso, o autor pode mencionar grupos e pessoas com `@`, destacando visualmente para quem o post é direcionado, sem restringir a visibilidade.

