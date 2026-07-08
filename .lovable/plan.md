## Objetivo
Permitir que Super Admin (e HR/Diretor, conforme já autorizado) editem **email** e **senha** de qualquer usuário pelo diálogo "Editar Usuário".

## Mudanças

### 1. Edge Function `supabase/functions/update-user/index.ts`
- Aceitar novos campos opcionais no body: `email` e `password`.
- Regras de permissão:
  - `super_admin`: pode alterar email e senha de qualquer usuário.
  - `hr` / `director`: podem alterar email/senha apenas de usuários da mesma empresa (regra de company já existe); **não** podem alterar de super_admins (já bloqueado).
- Se `email` vier: chamar `supabaseAdmin.auth.admin.updateUserById(user_id, { email, email_confirm: true })` e também atualizar `profiles.email`.
- Se `password` vier (mín. 6 chars): chamar `updateUserById(user_id, { password })`.
- Manter comportamento atual quando os campos não são enviados.

### 2. Hook `src/hooks/useAllUsers.ts`
- Estender assinatura de `updateUser` para aceitar `email?: string` e `password?: string` e repassar à edge function.

### 3. Componente `src/components/super-admin/users/EditUserDialog.tsx`
- Adicionar campos ao form:
  - **Email** (input type=email, obrigatório, validação zod).
  - **Nova Senha** (input type=password, opcional, mín. 6 caracteres — deixar vazio para não alterar; placeholder "Deixe em branco para manter").
- Preencher email atual no `reset()` (adicionar `email` à prop `user`).
- Enviar `email` sempre; `password` apenas quando preenchido.

### 4. Página `src/pages/super-admin/Users.tsx`
- Passar `email` do usuário selecionado para o `EditUserDialog` (o campo já é carregado pelo hook).

## Fora de escopo
- Edit dialog do módulo Comercial (`src/pages/commercial/admin/`) — só mexer se você pedir; hoje esse diálogo é usado apenas para usuários da mesma empresa por HR/Diretor e não tinha esse pedido.
- Fluxo de "email de confirmação" — vamos marcar `email_confirm: true` para trocar direto, sem exigir reconfirmação (comportamento típico de painel admin). Me avise se preferir enviar link de confirmação.
