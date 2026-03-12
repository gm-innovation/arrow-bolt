

## Problema

O worker do `pdfjs-dist` v5.4.394 não carrega via CDN — o formato `.mjs` é bloqueado no ambiente embarcado do preview. O erro é: `"Setting up fake worker failed: Failed to fetch dynamically imported module"`.

## Solução

Desabilitar o web worker e usar o pdf.js em modo "inline" (sem worker separado). Isso é mais simples e confiável no ambiente Vite/Lovable.

### Arquivo: `src/components/ui/PDFCanvasViewer.tsx`

- Remover a configuração `pdfjs.GlobalWorkerOptions.workerSrc` (CDN)
- Substituir por `pdfjs.GlobalWorkerOptions.workerSrc = ''` e configurar `isEvalSupported: false` + usar `disableWorker: true` no `getDocument()`
- Alternativa mais robusta: importar o worker como URL do Vite:
  ```typescript
  import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  ```

A abordagem `?url` do Vite resolve o hash e serve o arquivo corretamente tanto em dev quanto em build.

### Alteração única

```typescript
// Linha 7 - trocar:
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

// Por:
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
```

### Arquivo alterado
- `src/components/ui/PDFCanvasViewer.tsx` (1 linha de import + 1 linha de config)

