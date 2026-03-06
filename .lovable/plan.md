

## Plano: Remover barra de rolagem visível da coluna central

### Mudança
No `Feed.tsx` linha 49, adicionar a classe `no-scrollbar` (já definida no `index.css`) à coluna central. Isso mantém o scroll funcional mas esconde a barra visual.

### Arquivo: `src/pages/corp/Feed.tsx`
- Linha 49: adicionar `no-scrollbar` às classes da div central

