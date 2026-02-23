
## Adicionar role "Comercial" ao formulario de criacao de usuario

### Problema
O dropdown de "Funcao" no dialog "Criar Novo Usuario" (pagina Super Admin > Usuarios) nao possui a opcao "Comercial", impedindo a criacao de usuarios para o modulo comercial.

### Solucao
Adicionar a opcao `<SelectItem value="commercial">Comercial</SelectItem>` ao dropdown de roles.

### Detalhe tecnico
- **Arquivo a modificar:** `src/components/super-admin/users/NewUserDialog.tsx`
  - Adicionar `<SelectItem value="commercial">Comercial</SelectItem>` na lista de opcoes do campo "Funcao", entre "RH" e "Tecnico"

- **Backend:** Nenhuma alteracao necessaria. A edge function `create-user` ja aceita o role `commercial` na lista `allowedRoles` (linha 88).

- **Banco de dados:** Nenhuma migracao necessaria. O sistema de roles (`user_roles`) ja suporta valores de texto livre.
