## Objetivo
Permitir que o usuário envie **arquivos** (não só fotos) para a Marina — PDFs, Word/Excel/PPT, TXT/CSV e imagens — para que ela analise/interprete o conteúdo ao responder ou abrir chamados.

## Escopo
Somente frontend do chat + Edge Function `ai-assistant` (extração de texto server-side quando não for imagem). Sem novos módulos, sem mudanças de RLS complexas — arquivos ficam em bucket privado dedicado.

## Mudanças

### 1. Storage
- Criar bucket privado `marina-attachments`.
- RLS em `storage.objects`:
  - INSERT/SELECT/DELETE: usuário autenticado só no próprio prefixo `{auth.uid()}/...`.
- Limite: 20 MB/arquivo (validação client-side).

### 2. Componente de upload (`src/components/ai/AIAttachmentUpload.tsx`, novo)
- Substitui/estende `AIPhotoUpload`. Aceita:
  - Imagens (jpg/png/webp/heic) — mantidas como base64 comprimido (fluxo atual, vai direto pro Gemini vision).
  - PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV — upload para `marina-attachments/{userId}/{uuid}-{filename}`, retorna `{ name, mime, size, path }`.
- Preview: miniatura para imagem; chip com ícone + nome + botão remover para documentos.
- Múltiplos anexos por mensagem (até 3).

### 3. `AIChat.tsx`
- Trocar `AIPhotoUpload` por `AIAttachmentUpload` para **todos os papéis** (hoje só técnico).
- Estado `selectedAttachments: Attachment[]` no lugar de `selectedImage`.
- Renderizar anexos nas bolhas de mensagem do usuário (imagem inline, chip para docs com link signed URL).

### 4. `useAIChat.ts`
- `sendMessage(text, attachments)` — envia array. Salva metadados em `ai_messages.metadata.attachments`.
- Body pro edge function: `{ message, attachments: [{ name, mime, path?, dataUrl? }] }`.
- Imagem legacy (`image`) continua funcionando por retrocompatibilidade.

### 5. Edge Function `ai-assistant`
- Aceitar `attachments`. Para cada:
  - **Imagem**: passar como `image_url` no payload multimodal do Gemini (já suportado).
  - **PDF/DOCX/XLSX/PPTX/TXT/CSV**: baixar do bucket via service role, extrair texto (usar `unpdf` para PDF, `mammoth` para docx, `xlsx` para planilhas, texto puro para txt/csv — todos via `esm.sh`), truncar em ~20k chars por arquivo, injetar como bloco no prompt do usuário: `[Anexo: nome.pdf]\n<conteúdo extraído>`.
  - Falha de extração → nota amigável `[Não foi possível ler {nome}]`, segue fluxo.
- Modelo: se qualquer anexo for imagem, usar `gemini-2.5-pro` (já é a regra). Caso contrário, `flash` normal.

### 6. Persistência
- `ai_messages.metadata` já é jsonb — armazenar `{ attachments: [...] }`.
- Renderizar histórico com os anexos ao carregar conversa.

## Fora de escopo
- OCR de imagens (Gemini vision já faz).
- Áudio/vídeo.
- Compartilhar anexos com o ticket de suporte (fica pra depois; hoje só o texto vai pro ticket via `create_support_ticket`).

## Aceite
- Qualquer usuário vê botão de anexo no chat da Marina.
- Envia PDF de 2 páginas + pergunta "resume isso pra mim" → Marina responde com base no conteúdo.
- Envia imagem + pergunta → funciona como hoje.
- Envia .docx com requisitos → Marina consegue citar trechos.
- Anexo aparece na bolha da mensagem e persiste ao recarregar a conversa.
