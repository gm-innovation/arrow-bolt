

## Plano: Corrigir persistência do nome fantasia ao editar cliente

### Problema identificado

Ao editar o nome fantasia e clicar "Atualizar Informações", o dado **é salvo** no banco, mas a lista de clientes **não atualiza** porque:

1. `CompanyInfoForm.onSubmit` salva no banco e chama `onSuccess(clientId)`
2. `NewClientForm.handleCompanySuccess` apenas muda a aba para "Embarcações" — **não fecha o dialog**
3. Se o usuário fechar o dialog sem clicar "Concluir", o `onOpenChange` do dialog em `Clients.tsx` (linha 330-332) **não chama `fetchClients()`**

Resultado: o dado persiste no banco, mas a lista na tela mostra o valor antigo.

### Correção

**`src/pages/admin/Clients.tsx`** — No `onOpenChange` do dialog de edição (linha 330-332), chamar `fetchClients()` quando o dialog fecha:

```tsx
onOpenChange={(open) => {
  setEditClientDialogOpen(open);
  if (!open) {
    setSelectedClient(null);
    fetchClients(); // recarrega lista ao fechar
  }
}}
```

Uma mudança de 1 linha.

