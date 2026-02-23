

## Reformular Solicitacoes para fluxo bidirecional

### Problema atual

O sistema trata "Recebidas" como "solicitacoes pendentes de aprovacao", filtrando por role. Mas o conceito correto e: qualquer pessoa pode enviar uma solicitacao para outra pessoa (ou departamento). A aba "Recebidas" deve mostrar solicitacoes **direcionadas ao usuario**, independentemente do role.

Exemplos:
- RH solicita documento a um funcionario -> aparece em "Recebidas" do funcionario
- Funcionario solicita contra-cheque ao RH -> aparece em "Recebidas" do RH
- Solicitacao de ferias que precisa de aprovacao -> segue o fluxo de aprovacao normalmente

### 1. Adicionar coluna `target_user_id` na tabela `corp_requests`

Migracao SQL:

```sql
ALTER TABLE corp_requests ADD COLUMN target_user_id uuid REFERENCES profiles(id);
```

Essa coluna indica **para quem** a solicitacao e direcionada. Pode ser NULL (solicitacoes gerais sem destinatario especifico, como pedidos de ferias que vao para o fluxo de aprovacao).

### 2. Atualizar `NewRequestDialog.tsx`

Adicionar campo **"Destinatario"** (opcional) no formulario:
- Um select que lista usuarios da empresa (via `useAllUsers` ou query similar)
- Quando preenchido, a solicitacao aparece na aba "Recebidas" do destinatario
- Quando nao preenchido, a solicitacao segue o fluxo de aprovacao normal (gerente/diretoria)

### 3. Reformular logica da aba "Recebidas" em `Requests.tsx`

**Antes:** Filtrava por role (admin ve tudo, gerente ve pending_manager, etc.)

**Depois:** A aba "Recebidas" mostra:
- Solicitacoes onde `target_user_id === user.id` (direcionadas ao usuario)
- MAIS solicitacoes pendentes de aprovacao conforme role (gerente, diretor) -- mantendo o fluxo de aprovacao

A aba "Recebidas" sera **sempre visivel** para todos os perfis.

### 4. Atualizar `useCorpRequests.ts`

Incluir `target_user_id` e o perfil do destinatario na query:

```sql
target:profiles!corp_requests_target_user_id_fkey(id, full_name, email)
```

Incluir `target_user_id` no tipo `CreateRequestParams`.

### 5. Atualizar `RequestDetailSheet.tsx`

Exibir o campo "Destinatario" nos detalhes da solicitacao quando `target_user_id` estiver preenchido.

### Resumo das alteracoes por arquivo

| Arquivo | Alteracao |
|---------|----------|
| Migracao SQL | Adicionar `target_user_id` na tabela |
| `src/hooks/useCorpRequests.ts` | Incluir target na query e no tipo CreateRequestParams |
| `src/components/corp/NewRequestDialog.tsx` | Adicionar campo "Destinatario" |
| `src/pages/corp/Requests.tsx` | Reformular filtro de "Recebidas" (target_user_id OU aprovacao), remover showReceivedTab |
| `src/components/corp/RequestDetailSheet.tsx` | Exibir destinatario |

