

## Plano: Corrigir menções e melhorar visual do dropdown

### Problemas identificados
1. **Usuários não aparecem ao digitar apenas `@`**: O código exige `debouncedSearch.length < 1` para retornar vazio — ou seja, sem texto após o `@`, nenhum usuário é buscado. Apenas as funções (roles) aparecem porque são filtradas localmente.
2. **Visual do dropdown precário**: O dropdown está sem estilização adequada, sem separadores claros e com aparência inconsistente.

### Mudanças em `src/components/corp/FeedMentionInput.tsx`

1. **Buscar usuários mesmo sem texto de busca**: Quando `debouncedSearch` for vazio (apenas `@` digitado), buscar os primeiros 8 usuários e 6 grupos para exibir como sugestões iniciais. Remover a condição `if (debouncedSearch.length < 1) return`.

2. **Melhorar visual do dropdown**:
   - Aumentar padding e espaçamento dos itens
   - Adicionar separadores visuais entre seções (Funções / Grupos / Pessoas)
   - Melhorar hover states e tipografia
   - Adicionar avatar/iniciais nos itens de usuário
   - Bordas arredondadas mais pronunciadas e sombra mais suave
   - Posicionar o dropdown acima do textarea (bottom) para não ficar cortado pelo layout

### Arquivo alterado
- `src/components/corp/FeedMentionInput.tsx`

