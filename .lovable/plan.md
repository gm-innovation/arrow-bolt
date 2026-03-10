

## Plano: Corrigir visualização de PDFs bloqueada pelo Chrome

### Problema
Chrome bloqueia URLs `blob:` dentro de iframes em contextos embarcados (como o preview do Lovable). Isso afeta dois componentes que usam `<iframe>` para exibir PDFs.

### Solução
Substituir os `<iframe>` por `<object type="application/pdf">` com fallback, e adicionar o atributo `sandbox` adequado. Caso `<object>` também seja bloqueado, usar a biblioteca `pdfjs-dist` (já instalada) para renderizar o PDF em canvas.

A abordagem mais confiável: converter o blob para base64 data URL e usar `<embed>` ou renderizar via `pdfjs-dist` em um canvas.

### Alterações

#### 1. `src/components/admin/measurements/MeasurementPDFPreview.tsx`
- Substituir `<iframe src={pdfUrl}>` por renderização via `pdfjs-dist`:
  - Ao gerar o blob, converter para `ArrayBuffer`
  - Usar `pdfjs.getDocument()` para carregar o documento
  - Renderizar cada página em um `<canvas>` dentro de um container com scroll
- Manter os botões "Abrir em Nova Aba", "Baixar PDF" e "Salvar PDF" funcionando normalmente

#### 2. `src/components/tech/reports/ReportPDF.tsx`
- Mesma abordagem: substituir `<iframe src={pdfUrl}>` por renderização via `pdfjs-dist` em canvas
- Manter toda a lógica existente de geração e download

#### 3. Criar componente reutilizável `src/components/ui/PDFCanvasViewer.tsx`
- Componente que recebe um `Blob` ou `ArrayBuffer`
- Usa `pdfjs-dist` para renderizar todas as páginas em canvases
- Suporta scroll entre páginas
- Reutilizado por ambos os previews

