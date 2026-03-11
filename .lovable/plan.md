

## Problema

As permissões estão invertidas:
- **`create-user`** permite `hr`, `coordinator`, `super_admin` ✅
- **`update-user`** permite apenas `coordinator` e `super_admin` ❌ — exclui RH e Diretor
- **Não existe funcionalidade de redefinir senha** — RH não consegue informar a senha aos técnicos após o cadastro

O RH edita técnicos diretamente via tabelas (`profiles` + `technicians`) pela página `hr/Technicians.tsx`, mas a edge function `update-user` (usada em outras telas) bloqueia RH e Diretor.

## Correção

### 1. Atualizar `update-user` edge function
Adicionar `hr` e `director` aos papéis autorizados, com as mesmas restrições de empresa que já existem para `coordinator`:
- Só pode editar usuários da mesma empresa
- Não pode alterar `super_admin`
- Não pode atribuir role `super_admin`
- Só `super_admin` pode mudar empresa

### 2. Criar edge function `reset-password`
Nova função server-side que usa `supabase.auth.admin.updateUserById()` para redefinir a senha. Permissões:
- `super_admin`, `hr`, `director` podem redefinir senhas
- `hr` e `director` só de usuários da mesma empresa
- Ninguém pode redefinir senha de `super_admin` (exceto outro `super_admin`)

### 3. Adicionar botão "Redefinir Senha" no dialog de edição do RH
Na página `src/pages/hr/Technicians.tsx`, dentro do dialog de edição, adicionar campo para nova senha com botão de gerar senha aleatória e copiar.

### Arquivos alterados
- `supabase/functions/update-user/index.ts` — adicionar `hr` e `director`
- `supabase/functions/reset-password/index.ts` — **criar** edge function
- `src/pages/hr/Technicians.tsx` — botão de redefinir senha no dialog de edição

