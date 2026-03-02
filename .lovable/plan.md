

## Remover CorpLayout do Feed Corporativo

O problema é que a página `Feed` (`src/pages/corp/Feed.tsx`) usa o componente `CorpLayout`, que renderiza as abas (Dashboard, Solicitações, Documentos). O Feed é um item global independente na sidebar e não deve exibir essas abas.

### Alteração

**`src/pages/corp/Feed.tsx`**
- Remover o import de `CorpLayout`
- Substituir `<CorpLayout>` por um `<div>` simples, mantendo todo o conteúdo interno igual

Apenas 1 arquivo alterado. Sem impacto em banco de dados ou outras páginas.

