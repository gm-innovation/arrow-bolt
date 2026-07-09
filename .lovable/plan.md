Escopo: modal **Editar Usuário do Super Admin** (`/super-admin/users` → `src/components/super-admin/users/EditUserDialog.tsx`) e o hook que popula a lista (`src/hooks/useAllUsers.ts`).

## Diagnóstico

**1. "Marketing" salva/exibe como "Comercial"**
- A migration `20260708164841_...sql` tem um trigger que, ao inserir `marketing` em `user_roles`, insere também uma linha espelho `commercial` (herança de permissões). O banco está correto.
- `useAllUsers.ts` monta o mapa de papéis assim:
  ```ts
  const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);
  ```
  Usuário Marketing tem duas linhas (`marketing` + `commercial`); o `Map` fica com a última — normalmente `commercial`. Por isso a lista/edição do Super Admin mostra "Comercial".

**2. "Salvar Alterações" só funciona após vários cliques**
- Bug conhecido do Radix `Select` dentro de `Dialog`: ao fechar o dropdown, `pointer-events: none` fica preso no `<body>` por alguns ms, engolindo o primeiro clique no botão.
- O botão também não tem estado de "salvando", então o usuário clica repetidamente sem feedback.

## Correções (somente frontend)

### `src/hooks/useAllUsers.ts`
Ao montar `rolesMap`, dar prioridade ao papel "real" sobre o espelho `commercial`:
- Se o usuário já tem um papel `!= commercial` no mapa, ignorar `commercial`.
- Caso contrário, gravar normalmente.

Resultado: usuário Marketing aparece como `marketing` na tela.

### `src/components/super-admin/users/EditUserDialog.tsx`
- Usar `form.formState.isSubmitting` para desabilitar o botão e mostrar "Salvando…".
- Ao fechar o `Select` de Função/Empresa, restaurar `document.body.style.pointerEvents = ''` (fix padrão para o combo Radix Select + Dialog), garantindo que o primeiro clique em "Salvar Alterações" seja registrado.

### Sem migrations
- Trigger `mirror_marketing_to_commercial` permanece intacto (herança de permissões do Marketing).

## Verificação
1. Lista de usuários em `/super-admin/users` mostra "Marketing" para usuários Marketing.
2. Abrir "Editar Usuário" → dropdown Função aparece com "Marketing" selecionado.
3. Trocar função e clicar uma única vez em "Salvar Alterações" → salva na hora; botão fica "Salvando…" até concluir.