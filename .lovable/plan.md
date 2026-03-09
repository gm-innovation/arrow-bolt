

## Plano: Corrigir validação do formulário de edição de cliente

### Diagnóstico

O formulário **não está enviando a requisição de update** ao banco — nenhuma requisição PATCH aparece nos logs de rede. Isso confirma que a validação do Zod está falhando e bloqueando o `onSubmit`. Mesmo com o handler `onError` adicionado, o toast pode não estar sendo percebido ou o código pode não ter sido recarregado.

O campo mais provável de estar falhando é o `phone`, cuja regex `^[\d\s\(\)\-\+]+$` pode não comportar todos os formatos armazenados. A validação `.optional()` no final não aceita `""` (string vazia) como `undefined`, forçando o valor a passar pelo regex.

### Correção

**`src/components/admin/clients/CompanyInfoForm.tsx`** — 2 mudanças:

1. **Relaxar o schema do Zod** para que `phone` e `email` com valor vazio não bloqueiem o submit:
```ts
const formSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(200),
  email: z.string().trim().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  contact_person: z.string().trim().max(200).optional().or(z.literal("")),
});
```
   - Remove `.email()` (validação rigorosa desnecessária) e `.regex()` do phone
   - Aumenta `max(20)` para `max(30)` pois telefones com código do país passam de 20

2. **Adicionar `console.log`** no início do `onSubmit` e no `onError` para diagnóstico imediato se o problema persistir

