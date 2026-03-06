

## Correção: Download de Arquivos e Reprodução de Vídeos no Feed

### Problema
1. **Arquivos (PDF)**: O link abre em nova aba (`target="_blank"`) apontando diretamente para a URL do storage, que é bloqueada pelo Chrome/extensões (`ERR_BLOCKED_BY_CLIENT`).
2. **Vídeos**: O player `<video>` pode falhar ao carregar de URLs cross-origin do storage.

### Solução

**`FeedMediaPreview.tsx`**:

1. **Download de arquivos via fetch+blob**: Substituir o `<a href target="_blank">` por uma função que faz `fetch()` da URL, cria um `Blob`, gera um `URL.createObjectURL()` e dispara o download programaticamente. Isso evita que o navegador/extensões bloqueiem a navegação direta ao domínio do storage.

2. **Vídeos com `crossOrigin`**: Adicionar `crossOrigin="anonymous"` ao elemento `<video>` para garantir carregamento cross-origin correto.

3. **Imagens**: Mesmo ajuste -- em vez de `window.open()`, usar a mesma abordagem fetch+blob para visualização em tela cheia ou download.

### Mudança principal

Criar uma função utilitária `downloadFile(url, filename)` que:
```ts
const downloadFile = async (url: string, name: string) => {
  const res = await fetch(url);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = name;
  a.click();
  URL.revokeObjectURL(blobUrl);
};
```

Aplicar essa função no botão de download de arquivos e no clique de imagens.

