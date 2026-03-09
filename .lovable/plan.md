

## Plano: Corrigir edição do nome fantasia -- causa raiz real

### Problema real identificado

Analisando o replay da sessão, o fluxo do usuário é:
1. Clica "Editar" no cliente
2. Altera o "Nome Fantasia" no campo do formulário
3. **Rola a página para baixo** e clica no botão **"Concluir"**

O botão "Concluir" (linha 73 de `NewClientForm.tsx`) **NÃO salva os dados** -- ele simplesmente fecha o dialog chamando `onSuccess()`. O botão que realmente salva é o "Atualizar Informações" dentro do `CompanyInfoForm`, que fica mais acima na página.

Resultado: o usuário edita o nome, clica "Concluir" pensando que está salvando, mas o dado nunca é enviado ao banco.

### Correção

**`src/components/admin/clients/NewClientForm.tsx`**:

1. Remover o botão "Concluir" separado quando em modo de edição, pois o dialog já tem o botão X para fechar
2. Alterar o `handleCompanySuccess` para que, em modo de edição, **não mude de aba automaticamente** -- apenas exiba o toast de sucesso (que o `CompanyInfoForm` já faz)

Alternativa (melhor UX): manter o "Concluir" mas **só como fechamento** e renomear para "Fechar", tornando claro que **não é** um botão de salvar. E adicionar um aviso se houver mudanças não salvas.

**Abordagem escolhida** (mais simples e efetiva):
- Em modo de edição, o `handleCompanySuccess` chama `onSuccess()` diretamente (fecha o dialog e recarrega a lista) em vez de mudar para a aba "Embarcações"
- Remover o botão "Concluir" redundante

```tsx
const handleCompanySuccess = (id: string) => {
  setClientId(id);
  if (clientData) {
    // Edit mode: close dialog after saving
    onSuccess?.();
  } else {
    // Create mode: navigate to vessels tab
    setActiveTab("vessels");
  }
};
```

E remover as linhas 71-75 (botão "Concluir").

Duas mudanças no mesmo arquivo, ~5 linhas alteradas.

