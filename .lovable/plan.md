

## Corrigir fluxo HR: Departamento obrigatório + seleção de colaborador

No modo `hr`, o fluxo correto é: selecionar departamento → filtrar colaboradores daquele departamento → selecionar o destinatário. Departamento não é opcional — é pré-requisito.

### Alterações em `DocumentUploadDialog.tsx`

1. **Modo `hr`**: Tornar departamento obrigatório (label "Departamento *"), e adicionar campo "Colaborador *" logo abaixo
2. **Seleção de colaborador**: Usar `useDepartmentMembers(departmentId)` para carregar membros do departamento selecionado e renderizar um `Select` com os nomes
3. **Estado**: Adicionar `selectedUserId` — ao selecionar departamento, limpar o colaborador selecionado. O `selectedUserId` substitui o `targetUserId` prop no upload
4. **Validação**: No modo `hr`, exigir `departmentId` e `selectedUserId` para habilitar o botão "Enviar"
5. **Modo `self`**: Manter departamento como opcional (sem campo de colaborador), o `owner_user_id` é o próprio usuário

