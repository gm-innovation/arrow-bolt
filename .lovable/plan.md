
Objetivo: fazer o vídeo tocar no player do front sem cair em “baixar vídeo”, mesmo quando o navegador bloqueia a URL direta do storage.

Diagnóstico (confirmado)
- O bloqueio não é do player em si: a URL do vídeo falha no browser (`Failed to fetch`).
- O fallback atual também falha porque usa `fetch` na mesma URL bloqueada.
- Neste caso, o arquivo tem nome com `bannerhome.mp4`, padrão comum de bloqueio por extensões/filtros de rede.

Abordagem proposta
1) Trocar o fallback de vídeo para buscar o arquivo via função backend (mesmo domínio da app), não pela URL pública do storage.
2) Converter essa resposta para `Blob` no front e alimentar o `<video src={blobUrl}>`.
3) Evitar o problema em uploads futuros salvando arquivos com nome técnico (UUID + extensão), sem palavras sensíveis como “banner”.

Arquivos a implementar
- `supabase/functions/corp-feed-media-proxy/index.ts` (nova função)
- `src/components/corp/FeedMediaPreview.tsx`
- `src/hooks/useCorpFeed.ts`

Plano técnico
1. Nova função `corp-feed-media-proxy`
- Recebe `attachmentId`.
- Valida usuário autenticado via header Authorization.
- Busca anexo + post e valida que usuário pertence à mesma empresa do post.
- Faz download do objeto no bucket `corp-feed-media` com chave de serviço.
- Retorna bytes com `Content-Type` correto (ex.: `video/mp4`).

2. Atualizar `FeedMediaPreview.tsx`
- No `VideoPlayer`, quando falhar `vid.file_url`, chamar a função proxy.
- Se proxy responder, criar `blobUrl` e manter player funcionando.
- Só mostrar fallback “Baixar vídeo” se proxy também falhar.
- Manter cleanup com `URL.revokeObjectURL`.

3. Atualizar `useCorpFeed.ts` (uploads futuros)
- Trocar path de upload de `timestamp-nome-original` para `uuid.ext`.
- Manter `file_name` original apenas para exibição (não no path).

Fluxo final
```text
video src direto falha -> chama proxy -> recebe bytes -> cria blob URL -> player toca normalmente
```

Validação
- Testar o vídeo atual que está quebrando: deve tocar no player sem abrir nova aba.
- Publicar novo vídeo com nome “banner*.mp4”: deve tocar normalmente.
- Confirmar que PDF/imagem continuam funcionando como antes.
- Testar no mobile (390/414) para garantir controle e reprodução no card.

Sem mudanças de banco necessárias para esta correção.
