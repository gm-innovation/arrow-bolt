## Problema

Há um conflito de instruções no system prompt da Marina:

- **Regra 10** (`index.ts` linha 383): "novo" = status do funil, não usar `since_days`.
- **Contexto `commercial`** (`index.ts` linha 20): diz literalmente que para "veja leads novos" deve executar com filtros padrão "**últimos 7 dias, todos os status**".

O modelo está seguindo o contexto comercial (mais específico/proeminente) em vez da regra 10, então continua filtrando por data ao invés de status.

## Correção

**1. `supabase/functions/ai-assistant/index.ts` — contexto `commercial` (linha 20):**

Remover o exemplo "últimos 7 dias, todos os status" e substituir por exemplo alinhado à regra 10:
- "leads novos" → `status: "novo"` (sem filtro de data)
- "últimos N dias" → usa `since_days` só quando o usuário pedir intervalo explícito
- Manter o tom "AJA, NÃO PERGUNTE" e o limite padrão de 20

**2. `supabase/functions/ai-assistant/tools.ts` — parâmetro `since_days` (linha 149):**

Reforçar na descrição do parâmetro: "Apenas para intervalos temporais explícitos do usuário (ex.: 'últimos 7 dias'). NÃO usar para a palavra 'novo/novos' — isso é status, não data."

**3. Deploy:** `ai-assistant` redeploya automaticamente.

## Validação

Testar "olá, tem algum lead novo pra mim?" → Marina deve chamar `query_crm_leads({ status: "novo" })` sem `since_days` e listar leads com status novo (ex.: Alexandre/DOF, Teste Deploy).