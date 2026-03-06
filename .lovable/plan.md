

## Plano: Corrigir rotas de Perfil/Configurações e criar página de perfil social

### Problema 1: Redirecionamento para Dashboard
O `UserMenu.tsx` nas funções `getProfilePath()` e `getSettingsPath()` não possui cases para `commercial`, `compras`, `qualidade`, `financeiro` e `director`. O default retorna `"/"`, que redireciona ao dashboard.

### Problema 2: Página de perfil social pública
Não existe uma página de perfil social onde outros funcionários possam visualizar informações de um colega (foto de capa, avatar, bio, posts, conquistas) e iniciar comunicação direta.

---

### Mudanças planejadas

**1. Corrigir `src/components/UserMenu.tsx`**
- Adicionar todos os roles faltantes em `getProfilePath()` e `getSettingsPath()`:
  - `commercial` → `/commercial/profile` e `/commercial/settings`
  - `compras` → `/supplies/profile` e `/supplies/settings`  
  - `qualidade` → `/quality/profile` e `/quality/settings`
  - `financeiro` → `/finance/profile` e `/finance/settings`
  - `director` → `/corp/profile` e `/corp/settings`
- Adicionar também o `getUserTitle()` para roles faltantes

**2. Criar rotas de Profile para roles sem elas**
- Supplies, Quality, Finance e Director não possuem rotas `/profile` no `App.tsx`
- Criar páginas de perfil reutilizando o componente existente (ou criando um componente compartilhado `SharedProfile`) que todos os roles usem, evitando duplicação

**3. Criar página de perfil social público (`/corp/profile/:userId`)**
- Nova página acessível por qualquer funcionário da mesma empresa
- Seções: foto de capa editável, avatar, nome, cargo/role, bio/descrição editável (pelo próprio usuário)
- Exibir: tempo de empresa, idade, posts recentes, conquistas/badges, grupos
- Botão "Enviar mensagem" para comunicação direta
- O perfil do próprio usuário mostra controles de edição (upload de capa, avatar, edição de bio)

**4. Adicionar campos no banco de dados**
- Migration para adicionar à tabela `profiles`:
  - `cover_url` (text, nullable) — URL da foto de capa
  - `bio` (text, nullable) — descrição/bio do usuário
- RLS: usuário pode atualizar apenas seus próprios campos

**5. Atualizar `FeedProfileSidebar` e posts do feed**
- Avatar e nome no feed devem ser clicáveis, redirecionando para `/corp/profile/:userId`

### Arquivos afetados
- `src/components/UserMenu.tsx` — adicionar cases faltantes
- `src/App.tsx` — adicionar rotas `/corp/profile/:userId`, profile routes para supplies/quality/finance
- `src/pages/corp/UserProfile.tsx` — **novo** — página de perfil social
- `src/components/corp/FeedProfileSidebar.tsx` — link para perfil social
- `src/components/corp/FeedPostCard.tsx` — avatar/nome clicáveis
- Migration SQL — campos `cover_url` e `bio` na tabela profiles

