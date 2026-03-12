

## Problemas identificados

1. **Download não funciona**: O bucket `corp-documents` é **privado** (`public = false`), mas o código usa `getPublicUrl()` para gerar a URL do arquivo. URLs públicas não funcionam em buckets privados — daí o erro "Bucket not found".

2. **Sem pré-visualização**: Atualmente o botão de download só abre a URL (que falha). Não há funcionalidade para visualizar imagens ou PDFs inline antes de baixar.

## Correção

### 1. Upload: salvar o **path** do storage em vez da URL pública

**Arquivo: `src/pages/onboarding/PublicOnboarding.tsx`**
- Mudar de `getPublicUrl()` para salvar o `path` do storage diretamente no campo `file_url` (ex: `onboarding/{id}/{typeId}/123-file.pdf`)

### 2. Download: usar `createSignedUrl` para gerar URLs temporárias

**Arquivo: `src/components/hr/OnboardingDetailDialog.tsx`**
- Substituir o link direto `<a href={doc.file_url}>` por uma função que gera uma signed URL via `supabase.storage.from('corp-documents').createSignedUrl(path, 3600)`
- Adicionar botão de pré-visualização (olho) que abre um dialog/modal

### 3. Pré-visualização de documentos

**Arquivo: `src/components/hr/OnboardingDetailDialog.tsx`**
- Adicionar dialog de preview que:
  - Para **imagens** (jpg/png): exibe `<img>` com a signed URL
  - Para **PDFs**: usa o componente `PDFCanvasViewer` já existente no projeto
- Botão de olho ao lado do download na tabela de documentos

### Arquivos alterados
- `src/pages/onboarding/PublicOnboarding.tsx` (salvar path em vez de public URL)
- `src/components/hr/OnboardingDetailDialog.tsx` (signed URL download + preview modal)

