

## Problema

O download abre o arquivo no navegador em vez de baixar. Isso acontece porque `createSignedUrl` gera uma URL externa — o atributo `download` do `<a>` não funciona em URLs cross-origin. Além disso, dados antigos podem ter URL completa em vez de path relativo no `file_url`.

## Solução

Alterar `handleDownload` para usar `supabase.storage.download()` (que retorna um Blob), criar um Object URL local e forçar o download real. Adicionar helper para normalizar paths legados.

### Arquivo: `src/components/hr/OnboardingDetailDialog.tsx`

1. Adicionar helper `normalizeStoragePath` para extrair path relativo de URLs completas legadas
2. Alterar `handleDownload` para:
   - Chamar `supabase.storage.from('corp-documents').download(path)` → Blob
   - Criar `URL.createObjectURL(blob)` → link local (mesmo domínio)
   - Usar `<a href=blobUrl download=fileName>` sem `target="_blank"`
   - Revogar o Object URL após o clique
3. Atualizar `getSignedUrl` e `handlePreview` para também usar `normalizeStoragePath`

### Arquivo alterado
- `src/components/hr/OnboardingDetailDialog.tsx` (apenas lógica de download)

