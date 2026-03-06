

## Plano: Remover SESMT, adicionar criação de grupo com admin do grupo

### Problema
1. O grupo "SESMT" é criado automaticamente mas não deveria existir
2. Não há como criar grupos customizados a partir da sidebar do feed
3. O criador do grupo deve ser administrador do mesmo, podendo convidar e remover membros

### Mudanças

**Migration SQL**:
- Deletar grupos SESMT existentes (`DELETE FROM corp_groups WHERE name = 'SESMT'`)
- Remover SESMT da function `auto_create_corp_groups_for_company()` (recriar sem a linha do SESMT)
- Adicionar coluna `admin_user_id` na tabela `corp_groups` para registrar quem é o administrador do grupo
- Criar tabela `corp_group_invites` (ou reutilizar `corp_group_members` com insert direto) para o admin convidar membros

**`src/components/corp/FeedProfileSidebar.tsx`**:
- Na seção "Meus Grupos" (linhas 161-177): sempre mostrar a seção (mesmo sem grupos), adicionar botão "+ Criar Grupo"
- Ao clicar, abrir dialog para nome + descrição
- Usar `createGroup` do `useCorpGroups` (que já adiciona o criador como membro)

**`src/hooks/useCorpGroups.ts`**:
- No `createGroup`, salvar `created_by` como `admin_user_id` do grupo
- Adicionar mutation `addMember(groupId, userId)` — admin convida diretamente (insert em `corp_group_members`)
- Adicionar mutation `removeMember(groupId, userId)` — admin remove membro (delete de `corp_group_members`)

**`src/pages/corp/GroupDetail.tsx`** e **`src/components/corp/GroupMembersSidebar.tsx`**:
- Verificar se o user logado é o `admin_user_id` do grupo
- Se sim, mostrar botão de remover ao lado de cada membro
- Adicionar botão "Convidar Membro" que abre dialog com busca de colaboradores da empresa para adicionar

**`src/components/corp/GroupInfoSidebar.tsx`**:
- Mostrar badge "Administrador" se o user é admin do grupo

### Detalhes técnicos
- A coluna `admin_user_id` referencia `auth.users(id)`, default null (grupos automáticos não têm admin de usuário)
- Para grupos custom criados pelo usuário, `admin_user_id = created_by`
- O admin pode adicionar membros sem necessidade de aprovação (bypass do fluxo de join request)
- RLS: permitir que o admin do grupo faça insert/delete em `corp_group_members` para seu grupo

