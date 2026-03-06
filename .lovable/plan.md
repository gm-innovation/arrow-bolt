

## Plano: Remover Áudio e Adicionar Exclusão de Post

### 1. Remover botão de Áudio (`FeedCreatePost.tsx`)
- Remover o botão "Áudio" (linhas 106-108) e o import `Music`.

### 2. Adicionar botão de excluir post (`FeedPostCard.tsx`)
- Adicionar um menu dropdown (MoreHorizontal/três pontos) no header do post, visível apenas para o autor do post.
- Opção "Excluir" com confirmação via AlertDialog para evitar exclusões acidentais.
- Usar a mutation `deletePost` já existente no hook `useCorpFeed`.

### 3. Comentários
- A exclusão de comentário já funciona (botão lixeira aparece no hover para o autor). Nenhuma mudança necessária.

### Arquivos alterados
- `src/components/corp/FeedCreatePost.tsx` — remover botão áudio
- `src/components/corp/FeedPostCard.tsx` — adicionar menu com opção de excluir post

