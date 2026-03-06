
Plano objetivo para corrigir os 2 pontos reportados

1) Diagnóstico rápido (com base no código atual)
- O botão “Alterar capa” depende de `input hidden + ref + click programático` em `UserProfile.tsx`. Esse padrão pode falhar em alguns navegadores/contextos e hoje não há tratamento robusto de erro em todo o fluxo.
- Em “Publicações recentes” (`UserProfileLeftSidebar.tsx`), só imagem recebe preview visual; vídeo e arquivo aparecem apenas como ícone/contador (por isso você vê texto + foto, mas não “vê” vídeo/arquivo de fato).

2) Correção do botão “Alterar capa”
- Arquivo: `src/pages/corp/UserProfile.tsx`
- Trocar o gatilho de upload para padrão mais confiável:
  - usar `input type="file"` com `id` + botão/label associado (sem depender só de `ref.click()`).
- Fortalecer fluxo de upload:
  - `try/catch/finally` no upload de capa;
  - validar tipo e tamanho no cliente (alinhado ao bucket: jpeg/png/webp/gif, até 5MB);
  - capturar e tratar erro também no `update` do perfil (hoje não está validado);
  - estado visual de carregamento no botão (“Enviando capa...” + spinner).
- Manter cache-busting e limpeza dos arquivos antigos, mas com feedback de erro claro (toast com causa real).

3) Exibir vídeo e arquivo nas “Publicações recentes”
- Arquivo: `src/components/corp/UserProfileLeftSidebar.tsx`
- Ajustar query para trazer metadados completos do anexo (incluindo `id` e `file_size`) para suportar preview/download correto.
- Renderização por tipo:
  - imagem: thumbnail (já existe);
  - vídeo: mini player inline (preview real, não só ícone);
  - arquivo: card do arquivo com nome + botão de download.
- Para evitar inconsistência de mídia (domínio bloqueado/adblock), reutilizar lógica já existente de preview/download robusto (proxy/fallback) em vez de criar tratamento paralelo simplificado.

4) Padronização de UI sem quebrar layout
- Manter o mesmo card “Publicações recentes” na coluna esquerda e o mesmo padrão visual atual.
- Só evoluir o conteúdo dos itens para que vídeo e arquivo também tenham visualização útil.

5) Validação final (E2E)
- Testar com 4 posts: texto, imagem, vídeo e PDF.
- Confirmar:
  - botão de capa abre seletor e atualiza capa após upload;
  - vídeo aparece e reproduz na lista de recentes;
  - arquivo aparece com ação de download;
  - nenhum redirecionamento inesperado ou regressão no restante da página.
