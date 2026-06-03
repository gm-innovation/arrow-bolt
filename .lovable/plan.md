## Problema

Marina respondeu corretamente "temos 2 leads novos…" mas, no follow-up "me explica cada um o que tem", devolveu "Desculpe, não entendi sua pergunta". O histórico é enviado (memory_size=20), porém:

- A **regra técnica #2** do system prompt força "Sempre que o usuário perguntar sobre dados do sistema, chame a ferramenta antes de responder". Como não existe ferramenta `explain_lead`, o modelo trava.
- As **role_instructions** salvas no Agent Manager reforçam "AJA, execute a ferramenta imediatamente" sem prever follow-ups conversacionais sobre dados já apresentados.

Resultado: agente perde a capacidade de conversar sobre o que ele mesmo acabou de mostrar.

## O que ajustar

### 1. `supabase/functions/ai-assistant/index.ts` — system prompt (regras técnicas mínimas)

Reescrever as regras para permitir comportamento conversacional:

- **Regra 2 (atual):** "Sempre que o usuário perguntar sobre dados do sistema, chame a ferramenta antes de responder."
- **Nova regra 2:** "Para pedidos de **novos dados**, chame a ferramenta. Para **follow-ups** sobre itens já apresentados no histórico desta conversa (ex.: 'me explica', 'detalha esse', 'e o segundo?', 'qual o telefone dele?'), responda usando o contexto já presente, sem rechamar a ferramenta — a menos que falte campo específico."
- Adicionar **Regra 7:** "Seja conversacional. Mantenha o fio da conversa: pronomes ('ele', 'esse', 'cada um') referem-se aos últimos itens listados. Nunca peça para o usuário reformular se a referência é clara pelo histórico."

### 2. Database — `ai_agents.behavior.role_instructions` (todos os perfis CRM)

Adicionar ao final de cada role_instructions (commercial, coordinator, manager, director, super_admin):

> "FOLLOW-UPS: quando o usuário pedir detalhes sobre itens que você já listou nesta conversa ('me explica cada um', 'fala mais do primeiro', 'qual o e-mail dele'), responda a partir do histórico — não rechame ferramenta nem peça para reformular. Só rechame ferramenta se o usuário pedir algo realmente novo (outro filtro, outro recorte, outro módulo)."

Manter a regra existente de "AJA, NÃO PERGUNTE" — ela continua válida para pedidos novos.

### 3. Validação

- Cenário A: "tem algum lead novo?" → chama `query_crm_leads({status:'new'})` e lista.
- Cenário B (follow-up): "me explica cada um o que tem" → responde a partir do histórico, descrevendo nome, empresa, e-mail, telefone e data de cada lead já listado, **sem** chamar ferramenta de novo e **sem** pedir reformulação.
- Cenário C: "e os leads de oportunidade?" → considera pedido novo, chama ferramenta com novo filtro.

## Arquivos alterados

- `supabase/functions/ai-assistant/index.ts` (apenas o bloco `REGRAS TÉCNICAS MÍNIMAS` em `buildSystemPrompt`)
- Banco: UPDATE em `ai_agents.behavior.role_instructions` (sem migration — é dado de configuração editável pela UI Agent Manager → Comportamento, mantendo a regra de "tudo via UI")
