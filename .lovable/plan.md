

## Plano: Corrigir perfil social e reorganizar layout do feed

### Problemas identificados

1. **Botão "Alterar capa" não funciona** — O `input` de arquivo está com `ref` correto e o `onClick` chama `coverInputRef.current?.click()`, mas o problema é que o `input` está dentro de um bloco condicional `isOwnProfile` que renderiza corretamente. Preciso verificar se o storage bucket `user-avatars` aceita uploads no path `covers/`. Provavelmente é um problema de RLS no storage ou o bucket não existe/não aceita o path.

2. **Publicações recentes mostram só texto** — A query de `recentPosts` em `UserProfile.tsx` seleciona apenas `id, content, title, created_at`. Falta incluir `corp_feed_attachments` para mostrar preview de mídias.

3. **Layout da página de perfil** — O usuário quer que as publicações recentes fiquem na **coluna esquerda** da sidebar do feed (junto com grupos, enquete, discussões), e a **coluna central** do perfil social mostre publicações onde o usuário foi mencionado ("compartilhadas comigo").

4. **Acesso ao perfil no feed** — Precisa de um acesso mais intuitivo à página de perfil diretamente do feed principal.

---

### Mudanças planejadas

**1. Corrigir upload de capa (`UserProfile.tsx`)**
- Verificar e garantir que o bucket `user-avatars` aceita o path `covers/` via RLS de storage
- Adicionar tratamento de erro mais detalhado no `uploadCover` para mostrar o erro real ao usuário
- Adicionar `cache-busting` na URL da capa para forçar atualização visual após upload

**2. Publicações recentes com preview de mídia (`UserProfile.tsx`)**
- Alterar a query de `recentPosts` para incluir `corp_feed_attachments(file_url, file_type, file_name, mime_type)`
- Renderizar thumbnails de imagens e ícones de vídeo/arquivo ao lado do texto de cada publicação

**3. Mover publicações recentes para a sidebar esquerda (`FeedProfileSidebar.tsx`)**
- Adicionar nova seção "Publicações recentes" no `FeedProfileSidebar` (abaixo de Discussões, acima de Stats)
- Buscar as últimas 5 publicações do usuário com attachments
- Exibir como lista compacta com preview de mídia (thumbnail pequeno para imagens, ícone para vídeos/arquivos)

**4. Coluna central do perfil: publicações compartilhadas comigo**
- Na página `UserProfile.tsx`, a coluna central (md:col-span-2) deve mostrar publicações onde o usuário foi mencionado via `corp_feed_mentions`
- Query: buscar posts onde `corp_feed_mentions.mention_value = userId` ou `mention_type = 'user'` e `mention_value = userId`
- Renderizar como cards de post compactos com autor, conteúdo e mídia

**5. Acesso intuitivo ao perfil no feed (`Feed.tsx` / `FeedProfileSidebar.tsx`)**
- Adicionar botão "Ver meu perfil" visível na sidebar esquerda, logo abaixo do avatar/nome
- Estilo: botão outline compacto com ícone de usuário

### Arquivos afetados
- `src/pages/corp/UserProfile.tsx` — corrigir capa, publicações com mídia, coluna central = menções
- `src/components/corp/FeedProfileSidebar.tsx` — adicionar publicações recentes + botão "Ver perfil"

