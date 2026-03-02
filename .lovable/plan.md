

## Grupos: Entrar pela Direita + Acessar pela Esquerda

### Problema Atual
- Sidebar direita lista apenas "Grupos Populares" (top 5) sem ação — usuário não consegue entrar em nenhum grupo.
- Sidebar esquerda lista nomes dos grupos que participa, mas não são clicáveis.

### Solução

**1. `src/components/corp/FeedRightSidebar.tsx`** — Listar TODOS os grupos com botão "Entrar"/"Sair"
- Substituir query manual `feed-popular-groups` por `useCorpGroups(companyId)` 
- Listar todos os grupos da empresa dentro de `ScrollArea`
- Para cada grupo: nome, badge de membros, e botão "Entrar" (se não é membro) ou "Sair" (se é membro)
- Grupos `role_based`: badge "Automático", sem botão de ação (membership gerida pelo trigger)
- Invalidar `my-corp-groups` ao entrar/sair para atualizar sidebar esquerda

**2. `src/components/corp/FeedProfileSidebar.tsx`** — Tornar grupos clicáveis
- Ao clicar em um grupo que o usuário participa, navegar para `/corp/groups` (página de grupos) onde pode ver detalhes e membros
- Usar `useNavigate` do react-router-dom para navegação
- Cada badge de grupo vira um link/botão clicável com hover visual

### Segurança
- RLS já permite: SELECT para mesma empresa, INSERT com `user_id = auth.uid()`, DELETE com `user_id = auth.uid()`
- Nenhuma alteração de banco necessária

