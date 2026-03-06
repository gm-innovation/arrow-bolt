

## Plano: Usar FeedMediaPreview nos posts do perfil de usuário

### Problema
O `UserProfilePosts` usa uma função `getAttachmentPreview` simplificada que apenas mostra textos como "1 vídeo" e "1 arquivo" em vez de renderizar a mídia real (player de vídeo, imagem, card de arquivo com download). O componente `FeedMediaPreview` já existe e resolve isso.

### Mudança

**`src/components/corp/UserProfilePosts.tsx`**:
1. Importar `FeedMediaPreview` de `./FeedMediaPreview`
2. Incluir `id, file_size` no select de `corp_feed_attachments` (necessário para o proxy de vídeo)
3. Remover a função `getAttachmentPreview` e as importações `Film, FileIcon`
4. Substituir `getAttachmentPreview(attachments)` por `<FeedMediaPreview attachments={attachments} />`

Isso garante que vídeos, arquivos e imagens sejam exibidos de forma idêntica ao feed principal em qualquer contexto de perfil.

