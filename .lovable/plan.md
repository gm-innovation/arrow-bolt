

## Plano: Exibir foto de capa do usuário na sidebar do Feed

### Problema
A sidebar de perfil no feed (`FeedProfileSidebar`) mostra apenas um gradiente estático (`h-16 bg-gradient-to-r`) em vez da foto de capa do usuário. O campo `cover_url` não é buscado na query nem passado ao componente.

### Mudanças

**1. `src/pages/corp/Feed.tsx`** — Incluir `cover_url` no select da query de perfil (linha 25):
- Adicionar `cover_url` ao `.select(...)` junto dos outros campos

**2. `src/components/corp/FeedProfileSidebar.tsx`** — Exibir a capa:
- Adicionar `cover_url?: string` à interface `FeedProfileSidebarProps.profile`
- Na div de capa (linha 117), renderizar `<img>` com `object-cover` quando `cover_url` existir, mantendo o gradiente como fallback

### Arquivos afetados
- `src/pages/corp/Feed.tsx`
- `src/components/corp/FeedProfileSidebar.tsx`

