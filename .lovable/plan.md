

## Plano: Redesign completo do dropdown de menções

### Problemas atuais
1. O dropdown está sendo renderizado dentro de um container com `overflow` restrito, causando corte visual
2. O estilo do dropdown é básico demais — sem contraste visual claro, sem tabs de filtragem, itens sem destaque adequado
3. Falta uma experiência de navegação por categorias como no exemplo de referência (abas "Funções / Grupos / Pessoas")

### Solução: Dropdown com abas de filtragem e visual premium

**Arquivo: `src/components/corp/FeedMentionInput.tsx`** — reescrita substancial

1. **Usar React Portal** para renderizar o dropdown fora do container com overflow, posicionado absolutamente em relação ao textarea usando `getBoundingClientRect()`. Isso resolve definitivamente o problema de clipping.

2. **Adicionar abas de filtragem** no topo do dropdown:
   - "Todos" (padrão) — mostra tudo
   - "Pessoas" — filtra só usuários
   - "Funções" — filtra só roles
   - "Grupos" — filtra só grupos

3. **Melhorar visual dos itens**:
   - Fundo branco sólido com sombra `shadow-xl` e borda definida
   - Itens com hover `bg-accent` mais visível (como o highlight azul do exemplo)
   - Item selecionado com fundo `bg-primary text-primary-foreground` (destaque forte como no print de referência)
   - Ícones diferenciados por tipo (Users para funções/grupos, avatar com iniciais para pessoas)
   - Tipografia mais legível: nome em `font-medium`, subtipo em `text-muted-foreground text-xs`

4. **Posicionamento dinâmico**: Calcular se o dropdown cabe abaixo do textarea; se não, abrir acima. Usar `createPortal` do React DOM para renderizar no `document.body`.

5. **Largura fixa** do dropdown igual à largura do textarea (medida via ref).

### Resultado esperado
Um dropdown flutuante estilo command palette, com abas no topo para filtrar por categoria, itens bem destacados com hover azul/primary, e sem problemas de clipping independente da posição na página.

