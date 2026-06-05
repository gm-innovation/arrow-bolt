## Problema

Após Marina listar 2 leads, o usuário perguntou "quais as solicitações?" — querendo dizer "o que cada um desses leads pediu". Marina respondeu pedindo clarificação ("de qual tipo? compra, corporativa, OS?") porque:

1. **A ferramenta `query_crm_leads` não retorna o campo `message`** (nem `type` / `items`) — só nome, e-mail, telefone, empresa, status, source, data. Marina nunca recebeu a "solicitação" do lead, então não tem como respondê-la a partir do histórico.
2. **A regra conversacional não orienta a desambiguar a favor do contexto recente.** "Solicitações" logo após uma listagem de leads deveria ser interpretado como "o que esses leads pediram", não como módulo paralelo (compras/corp/OS).

## O que ajustar

### 1. `supabase/functions/ai-assistant/tools.ts` — `query_crm_leads`

Adicionar `message`, `type` e `items` aos campos retornados, para que a resposta inicial já contenha o conteúdo da solicitação de cada lead. Atualizar a descrição da ferramenta indicando que `message` é o texto livre da solicitação e `items` é a lista de produtos/serviços de interesse.

```
fields: ["id","name","email","phone","company_name","status","source","type","message","items","created_at"]
```

### 2. `supabase/functions/ai-assistant/index.ts` — regra 7 (conversacional)

Expandir a regra para incluir desambiguação contextual:

> "Seja conversacional. Pronomes e termos genéricos ('ele', 'esse', 'cada um', 'as solicitações', 'os pedidos', 'os detalhes') referem-se primeiro aos últimos itens que você listou. Antes de pedir clarificação, tente resolver pelo contexto da conversa. Só pergunte se realmente nenhuma interpretação contextual for plausível."

### 3. Database — `ai_agents.behavior.role_instructions` (perfis CRM)

Acrescentar ao bloco FOLLOW-UPS já existente:

> "Termos genéricos logo após uma listagem ('quais as solicitações?', 'o que pediram?', 'me mostra os detalhes') referem-se aos itens recém-listados. Para leads, 'solicitação' é o campo `message`/`items` retornado pela ferramenta."

### 4. Validação

- "olá, tem algum lead novo?" → lista 2 leads incluindo o que cada um solicitou (campo `message`/`items`).
- "quais as solicitações?" (follow-up) → resume `message`/`items` de cada lead listado, sem pedir clarificação.
- "quais as solicitações de compra?" → entende qualificador explícito e chama `query_purchase_requests`.

## Arquivos alterados

- `supabase/functions/ai-assistant/tools.ts` (campos de `query_crm_leads`)
- `supabase/functions/ai-assistant/index.ts` (regra 7 do system prompt)
- Banco: UPDATE em `ai_agents.behavior.role_instructions` (sem migration — config editável pela UI Agent Manager)
