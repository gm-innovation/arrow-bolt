

## Plano: Expandir layout do Feed para usar mais espaço disponível

### Problema
O container está limitado a `max-w-[1100px]`, o que deixa muito espaço vazio em telas grandes, especialmente com o sidemenu recolhido.

### Mudança

**`src/pages/corp/Feed.tsx`** (linha 45):
- Trocar `max-w-[1100px]` por `max-w-[1400px]` para aproveitar melhor telas grandes
- Isso expande a coluna central do feed enquanto mantém as sidebars com largura fixa de 260px

Uma única alteração de classe CSS.

