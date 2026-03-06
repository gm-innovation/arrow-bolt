

## Plano: Adicionar lista de colaboradores no Feed

### Objetivo
Criar um card "Colaboradores" na sidebar direita (`FeedRightSidebar`) que lista todos os funcionários da mesma empresa, com avatar, nome e cargo, clicáveis para navegar ao perfil (`/corp/profile/:id`). Incluir campo de busca para filtrar por nome.

### Mudanças

**`src/components/corp/FeedRightSidebar.tsx`**:
- Adicionar query para buscar todos os profiles da mesma empresa (`company_id`), com `full_name`, `avatar_url`, `id`
- Buscar roles via `user_roles` para exibir o cargo
- Adicionar um novo card "Colaboradores" com:
  - Input de busca para filtrar por nome
  - Lista scrollável de colaboradores (avatar + nome + cargo)
  - Cada item clicável → `navigate(/corp/profile/${id})`
- Posicionar o card no topo ou logo após os badges

### Detalhes técnicos
- Query: `profiles` filtrado por `company_id`, join com `user_roles` para role
- Busca local (client-side filter) pelo nome
- ScrollArea com altura máxima para não explodir o layout
- Reutilizar o mapa de labels `ROLE_LABELS` (importar ou duplicar)

