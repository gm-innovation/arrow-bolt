

## Adicionar Mídia ao Feed Corporativo

### Banco de Dados

**1. Storage bucket** `corp-feed-media` (público) para armazenar fotos, vídeos, áudios e arquivos, com RLS permitindo upload por autenticados e leitura pública.

**2. Tabela `corp_feed_attachments`**:
- `id` (uuid PK), `post_id` (FK → corp_feed_posts), `file_url` (text), `file_name` (text), `file_type` (text — image/video/audio/file), `file_size` (bigint), `mime_type` (text), `created_at`
- RLS: leitura para autenticados, inserção/deleção pelo autor do post

### Hook `useCorpFeed.ts`

- Adicionar mutation `uploadAttachments` que faz upload dos arquivos para o bucket e insere registros na tabela `corp_feed_attachments`
- Atualizar query de posts para incluir `corp_feed_attachments(*)` no select
- Atualizar `createPost` para aceitar arquivos e chamar upload após criação do post

### Componente `FeedCreatePost.tsx`

- Adicionar barra de ações com botões: Foto (📷), Vídeo (🎥), Áudio (🎤), Arquivo (📎)
- Cada botão abre um `<input type="file">` com accept filtrado (image/*, video/*, audio/*, *)
- Preview dos anexos selecionados antes de publicar: thumbnails para imagens, ícones para outros tipos
- Botão X para remover anexo antes de publicar
- Permitir múltiplos anexos por post

### Componente `FeedPostCard.tsx`

- Renderizar anexos do post:
  - **Imagens**: grid responsivo com preview clicável
  - **Vídeos**: player `<video>` nativo com controles
  - **Áudios**: player `<audio>` nativo com controles
  - **Arquivos**: card com ícone + nome + tamanho + botão download

### Componente novo: `FeedMediaPreview.tsx`

Componente reutilizável que recebe a lista de attachments e renderiza o layout adequado (grid de imagens, players de mídia, cards de arquivo).

