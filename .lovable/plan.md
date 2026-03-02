

## Remover botão "Novo Post" e dialog

O botão "+ Novo Post" e o `FeedPostDialog` são redundantes — o componente inline `FeedCreatePost` já permite criar posts com menções, mídia e tudo mais.

### Alterações

1. **`src/pages/corp/Feed.tsx`** — Remover import do `FeedPostDialog`, remover a lógica `canPin`, e remover o botão do header. Manter apenas o título "Feed Corporativo" e o `FeedCreatePost` inline.

2. **`src/components/corp/FeedPostDialog.tsx`** — Deletar o arquivo, pois não será mais utilizado.

