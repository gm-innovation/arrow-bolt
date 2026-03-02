

## Feed com Cara de Rede Social + Grupos Personalizados

### 1. Migração SQL — Novos campos e tabelas

**Adicionar campos ao `profiles`:**
- `birth_date DATE` — data de nascimento
- `hire_date DATE` — data de admissão na empresa

**Criar tabela `corp_groups`:**
- `id`, `company_id` (FK), `name`, `description`, `group_type` (enum: 'role_based' | 'custom'), `role_slug` (text, nullable — para grupos automáticos baseados em role), `avatar_url`, `created_by` (FK profiles), `created_at`
- Grupos automáticos criados por trigger/seed quando empresa é criada (CIPA, Técnicos, RH, etc.)
- Grupos customizados criados por qualquer usuário (ex: "Prevenção de Incêndio", "Comitê de Segurança")

**Criar tabela `corp_group_members`:**
- `id`, `group_id` (FK), `user_id` (FK profiles), `joined_at`
- Para grupos `role_based`, membros são sincronizados automaticamente com `user_roles`
- Para grupos `custom`, membros são adicionados manualmente

**RLS:** Leitura para autenticados da mesma empresa; criação de grupos custom por qualquer autenticado; gerenciamento de membros pelo criador do grupo ou admins.

**Atualizar `corp_feed_mentions`:** Adicionar suporte a `mention_type = 'group'` além de 'role' e 'user'.

### 2. Componente `FeedUserProfileCard.tsx` (Novo)

Card/tooltip ao clicar no avatar ou nome do autor de um post, mostrando:
- Avatar grande, nome completo
- Função/cargo (via `user_roles`)
- Tempo de empresa (calculado a partir de `hire_date`)
- Idade ou data de nascimento
- Grupos aos quais pertence

### 3. Atualizar `FeedPostCard.tsx`

- Exibir a função do autor abaixo do nome (ex: "Técnico" / "RH" / "Gerente")
- Avatar clicável que abre o `FeedUserProfileCard`
- Exibir menções de grupo com ícone diferenciado

### 4. Atualizar `FeedMentionInput.tsx`

- Adicionar seção "Grupos" no dropdown de autocomplete (@), além de "Funções" e "Pessoas"
- Buscar grupos da empresa no dropdown
- Diferenciar visualmente menções de grupo vs role vs pessoa

### 5. Página/componente de Grupos (`src/pages/corp/Groups.tsx`)

- Listagem de grupos (automáticos e customizados)
- Criar novo grupo customizado (nome, descrição, membros)
- Ver membros de cada grupo
- Entrar/sair de grupos customizados
- Link na sidebar do módulo Corp

### 6. Atualizar `useCorpFeed.ts`

- Incluir role do autor nos posts (join com `user_roles`)
- Incluir `hire_date` para calcular tempo de empresa
- Suportar `mention_type = 'group'` na criação de posts

### 7. Funcionalidades adicionais sugeridas

Além do solicitado, as seguintes funcionalidades são pertinentes para um feed corporativo completo:

- **Reações variadas** — Além do curtir, adicionar reações como 👏 💡 🎉 (estilo LinkedIn/Slack)
- **Compartilhar post** — Repostar conteúdo de outro colaborador
- **Enquetes/Votações** — Criar enquetes rápidas no feed (ex: "Qual melhor data para o confraternização?")
- **Aniversariantes do mês** — Card automático no topo do feed com aniversariantes e novos colaboradores
- **Mural de reconhecimento** — Posts especiais para reconhecer colegas (tipo "Kudos")
- **Notificações de menção** — Notificar usuários quando são mencionados em posts ou comentários
- **Busca no feed** — Pesquisar posts por texto, autor ou grupo
- **Post fixado por grupo** — Permitir fixar comunicados importantes por grupo específico

### Resumo de alterações por arquivo

| Arquivo | Ação |
|---|---|
| Migração SQL | Campos `birth_date`/`hire_date` em profiles + tabelas `corp_groups` e `corp_group_members` |
| `FeedUserProfileCard.tsx` | Criar — card de perfil ao clicar no avatar |
| `FeedPostCard.tsx` | Editar — exibir role do autor, avatar clicável |
| `FeedMentionInput.tsx` | Editar — adicionar grupos no autocomplete |
| `FeedCreatePost.tsx` | Ajuste menor para novos tipos de menção |
| `useCorpFeed.ts` | Editar — incluir role e hire_date, suportar grupo |
| `Groups.tsx` | Criar — página de gerenciamento de grupos |
| Sidebar Corp | Editar — adicionar link para Grupos |

