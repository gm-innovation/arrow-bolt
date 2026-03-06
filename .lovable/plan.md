

## Plano: Fixar colunas laterais e permitir scroll apenas na coluna central

### Mudança
No `Feed.tsx`, aplicar `sticky top-0 self-start` nas colunas esquerda e direita, e `overflow-y-auto` com altura máxima na coluna central. O container principal precisa permitir scroll apenas na coluna do meio.

### Arquivo: `src/pages/corp/Feed.tsx`
- Coluna esquerda (linha 47): adicionar `sticky top-0 self-start`
- Coluna central (linha 49): adicionar `overflow-y-auto max-h-[calc(100vh-120px)]` para ser a única área rolável
- Coluna direita (linha 73): adicionar `sticky top-0 self-start` (se já não tiver)

