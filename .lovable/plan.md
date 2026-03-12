

## Certificado: Preview + Anexar ao Feed

### O que será feito

1. **Preview do certificado na aba "Certificados"** — Ao lado do botão "Baixar", adicionar um botão "Visualizar" que abre um modal com o certificado renderizado em canvas (usando o `PDFCanvasViewer` já existente no projeto), sem precisar baixar o PDF.

2. **Anexar certificado ao post do feed** — Quando um colaborador conclui um curso, o post de conquista no feed incluirá o PDF do certificado como anexo (upload para o storage `corp-feed-media` e registro em `corp_feed_attachments`), visível para toda a empresa.

### Alterações

**`src/pages/corp/MyLearning.tsx`**
- Adicionar botão "Visualizar" em cada certificado
- Abrir um Dialog/modal que gera o PDF blob e renderiza via `PDFCanvasViewer`

**`src/hooks/useUniversityCompletion.ts`**
- No `publishCourseCompletion`, após criar o post no feed:
  - Gerar o PDF blob usando `pdf(<CertificatePDF .../>).toBlob()`
  - Fazer upload do blob para o storage `corp-feed-media`
  - Inserir registro em `corp_feed_attachments` vinculado ao post
- Precisa receber dados adicionais: `userName`, `companyName`, `companyLogoUrl`, `durationMinutes`, `certificateCode`
- A assinatura muda para receber um objeto com todos os dados do certificado

**`src/pages/corp/UniversityCourse.tsx`**
- Atualizar a chamada de `publishCourseCompletion` para passar os dados completos do certificado (buscar do certificado recém-emitido ou construir inline)

### Fluxo
```text
Colaborador completa último módulo
  → Enrollment marcado como completed
  → Certificado emitido (BD)
  → PDF gerado em memória
  → Upload do PDF ao storage
  → Post criado no feed com attachment do certificado
  → Toda empresa vê o certificado no feed
```

### Arquivos
- **Editado:** `src/pages/corp/MyLearning.tsx` — modal de preview
- **Editado:** `src/hooks/useUniversityCompletion.ts` — gerar e anexar PDF ao post
- **Editado:** `src/pages/corp/UniversityCourse.tsx` — passar dados do certificado

