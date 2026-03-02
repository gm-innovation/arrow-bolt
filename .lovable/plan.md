

## Correção: Enquetes abertas a todos os usuários

### Problema
Atualmente, apenas Admin/HR podem criar enquetes e finalizá-las. O usuário quer que **qualquer pessoa** possa criar enquetes, escolhendo se será global (empresa) ou para um grupo específico do qual faz parte. Badges continuam exclusivos de Admin/HR.

### Alterações

**1. `FeedProfileSidebar.tsx`** (linhas 169-185)
- Remover a condição `isAdminOrHR` que restringe criação e finalização de enquetes
- Qualquer usuário pode criar enquete (quando não há enquete ativa) e finalizar a própria enquete
- Finalização: permitir ao autor da enquete OU admin/HR

**2. `FeedPollSidebarCreate.tsx`**
- Adicionar um campo `Select` para o usuário escolher o escopo: "Global (Empresa)" ou um dos grupos que ele participa
- Buscar os grupos do usuário via query em `corp_group_members`
- Passar `group_id` (nullable) ao criar o post de enquete

**3. Banco de dados** — migração SQL
- Adicionar coluna `group_id uuid references corp_groups(id) on delete cascade` na tabela `corp_feed_polls` (nullable — null = global)
- Ajustar RLS se necessário para membros do grupo verem enquetes de grupo

**4. `useCorpFeed.ts`**
- Suportar `group_id` no fluxo de criação de enquete (repassar para `corp_feed_polls`)

**5. Query de enquete ativa na sidebar**
- Filtrar enquetes ativas: mostrar global OU dos grupos do usuário

### Arquivos alterados
- `FeedProfileSidebar.tsx` — remover restrição admin/HR na criação/finalização
- `FeedPollSidebarCreate.tsx` — adicionar seletor de escopo (global vs grupo)
- `useCorpFeed.ts` — suportar `group_id` na criação
- Migração SQL — adicionar `group_id` em `corp_feed_polls`

