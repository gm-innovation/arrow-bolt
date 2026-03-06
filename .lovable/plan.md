

## Plano: Corrigir query do FeedColleaguesList

### Problema
A query `profiles.select('id, full_name, avatar_url, user_roles(role)')` falha com erro 400 porque não há foreign key entre `profiles` e `user_roles` (user_roles referencia `auth.users`, não `profiles`).

### Correção

**`src/components/corp/FeedColleaguesList.tsx`** — alterar a queryFn para:
1. Buscar `profiles` filtrados por `company_id` (id, full_name, avatar_url)
2. Buscar `user_roles` separadamente (user_id, role)
3. Criar um Map de roles por user_id e mesclar com os profiles no cliente

Mesmo padrão já usado em `useAllUsers.ts` (linhas 30-40).

