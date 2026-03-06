

## Plano: Ocultar o próprio usuário da lista de colaboradores

### Mudança

**`src/components/corp/FeedColleaguesList.tsx`**:
- Obter o `user` atual via `useAuth()` (já disponível no projeto)
- Filtrar o próprio `user.id` dos resultados antes de renderizar, adicionando `.filter(c => c.id !== user?.id)` na lista filtrada

Uma única linha de filtro + import do hook.

