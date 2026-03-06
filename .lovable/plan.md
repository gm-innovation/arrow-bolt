
Objetivo: corrigir a reprodução de vídeo no feed mesmo quando o navegador bloqueia URLs diretas do storage (ERR_BLOCKED_BY_CLIENT).

1) Diagnóstico confirmado
- O vídeo no card ainda usa `src` direto (`vid.file_url`) em `FeedMediaPreview.tsx`.
- Pelos prints, o bloqueio acontece ao acessar URL direta do storage; por isso o player fica em `0:00` sem tocar.
- Arquivo/PDF já melhorou porque usa `fetch + blob`; vídeo ainda não segue esse fluxo.

2) Implementação proposta (arquivo único)
- Arquivo: `src/components/corp/FeedMediaPreview.tsx`
- Criar fallback de vídeo via blob:
  - Manter `videoBlobUrls` em estado (chave por `attachment.id || file_url`).
  - No `onError` do `<video>`, executar `fetch(vid.file_url)` e converter para `blob`.
  - Gerar `URL.createObjectURL(blob)` e trocar o `src` do vídeo para esse blob local.
  - Evitar loop com controle de “já tentou fallback” por vídeo.
- Ajustar render do vídeo:
  - Usar `src` direto no `<video>` (em vez de `<source>`) para atualização reativa mais confiável.
  - Remover `crossOrigin="anonymous"` (não resolve este caso e pode atrapalhar em alguns cenários CORS).
- Limpeza de memória:
  - Revogar object URLs no `useEffect` de cleanup quando componente desmontar ou lista mudar.

3) UX de contingência
- Se o fallback blob falhar, mostrar mensagem curta no card (“Não foi possível carregar este vídeo neste navegador”) e botão “Baixar vídeo”.
- Reutilizar o mesmo utilitário de download já existente.

4) Validação (E2E)
- Testar no feed com MP4 real:
  - player deve sair de `0:00` e reproduzir normalmente;
  - progresso/tempo devem avançar;
  - sem abrir nova aba.
- Revalidar PDF e imagem para garantir que nada regrediu.
- Testar no mobile (largura 390/414) para confirmar comportamento do player e dos botões.

Detalhes técnicos
- Não precisa mudança de banco, bucket ou permissões.
- Mudança é somente frontend, isolada em `FeedMediaPreview.tsx`.
- Estratégia: quando mídia remota for bloqueada como recurso de vídeo, servir ao `<video>` uma URL local (`blob:`) criada via `fetch`, igual ao padrão que já funcionou para download.
