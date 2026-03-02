

## Popular BD com Categorias Padrão de Solicitação

O padrão já existe: quando uma empresa é criada, um trigger (`auto_create_corp_groups_for_company`) cria grupos automaticamente. Vamos seguir o mesmo padrão para os tipos de requisição.

### Alterações

1. **Migração SQL** — Criar uma função `auto_create_corp_request_types_for_company()` e um trigger `AFTER INSERT ON companies` que insere os 5 tipos padrão:
   - Produto / Material (`category: 'product'`, `requires_approval: true`)
   - Assinatura / Software (`category: 'subscription'`, `requires_approval: true`)
   - Documento (`category: 'document'`)
   - Folga / Férias (`category: 'time_off'`, `requires_approval: true`)
   - Geral (`category: 'general'`)

2. **Seed para empresas existentes** — Na mesma migração, inserir os tipos padrão para todas as empresas que já existem e ainda não possuem tipos cadastrados.

3. **`NewRequestDialog.tsx`** — Remover o fallback de "categorias padrão sem tipos" já que agora sempre haverá tipos no banco.

