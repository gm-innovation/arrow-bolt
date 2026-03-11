

## Problema

O coordenador tem acesso a páginas e funcionalidades de gestão de usuários/técnicos que não são da sua responsabilidade. As permissões corretas são:

- **Quem gerencia usuários**: RH, Diretor, Super Admin
- **Coordenador**: cuida apenas de OSs, calendário, clientes, relatórios operacionais

## Alterações

### 1. Edge Functions -- remover `coordinator` das permissões de gestão de usuários

- **`create-user/index.ts`**: Remover `coordinator` dos papéis autorizados. Manter apenas `super_admin`, `hr`, `director`.
- **`update-user/index.ts`**: Remover `coordinator` dos papéis autorizados. Manter apenas `super_admin`, `hr`, `director`.
- **`delete-user/index.ts`**: Substituir `admin` por `director`. Papéis finais: `super_admin`, `hr`, `director`.
- **`reset-password/index.ts`**: Verificar que só permite `super_admin`, `hr`, `director`.

### 2. Rotas do Coordenador (`App.tsx`) -- remover páginas de gestão

Remover do bloco de rotas do coordenador (`/admin/*`):
- `/admin/users`, `/admin/users/new`, `/admin/users/:userId`
- `/admin/technicians`

### 3. Menu lateral do Coordenador (`DashboardLayout.tsx`)

Remover do `adminMenuItems`:
- Item "Técnicos" (`/admin/technicians`)

O coordenador não tem item de "Usuários" no menu (já não aparece), mas as rotas existem -- serão removidas.

### 4. Remover restrição do RH para criar apenas técnicos (`create-user`)

Atualmente o `create-user` tem a restrição: `if (callerRole === 'hr' && role !== 'technician')`. Isso será removido para que o RH possa criar qualquer tipo de usuário da empresa (exceto `super_admin`).

### Arquivos alterados
- `supabase/functions/create-user/index.ts`
- `supabase/functions/update-user/index.ts`
- `supabase/functions/delete-user/index.ts`
- `supabase/functions/reset-password/index.ts` (verificar)
- `src/App.tsx` (remover rotas)
- `src/components/DashboardLayout.tsx` (remover item do menu)

