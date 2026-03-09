

## Plano: Diagnosticar e corrigir edição do nome fantasia

### Problema
O nome fantasia não persiste ao editar. Nos logs de rede, **não há nenhuma requisição PATCH/UPDATE** sendo enviada, e o banco ainda mostra o valor antigo. Isso indica que o `onSubmit` do formulário **nunca é chamado** — provavelmente porque a validação do react-hook-form está falhando silenciosamente em algum campo (email, telefone, etc.), e o erro não é exibido ao usuário.

### Correção

**`src/components/admin/clients/CompanyInfoForm.tsx`**:
- Adicionar callback `onError` ao `form.handleSubmit(onSubmit, onError)` no `<form>` para capturar e exibir erros de validação via toast
- Isso resolve o problema imediato (usuário vê qual campo está com erro) e previne que edições futuras falhem silenciosamente

```tsx
<form onSubmit={form.handleSubmit(onSubmit, (errors) => {
  const firstError = Object.values(errors)[0];
  toast({ title: "Erro de validação", description: firstError?.message as string, variant: "destructive" });
})} className="space-y-4">
```

Uma mudança de 1 linha.

