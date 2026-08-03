# Correção: prompt de desenvolvimento e contexto no Inbox de Suporte

## Diagnóstico (confirmado)

Os chamados #1036, #1038 e #1039 não foram abertos pelo fluxo normal de suporte da Marina — eles foram criados pela ferramenta `create_roadmap_item` (itens `[Roadmap]`). Consulta ao banco confirma: nesses três registros `page_url` é nulo, `conversation_excerpt` é nulo, `dev_prompt` é nulo e `dev_prompt_status` está em `pending`.

Causas:

1. A coluna `dev_prompt_status` tem default `'pending'` no banco. A ferramenta `create_roadmap_item` insere o ticket e **nunca dispara** a geração do prompt (diferente de `create_support_ticket`, que chama a função `generate-ticket-dev-prompt`). Resultado: o Inbox fica exibindo "Gerando…" para sempre.
2. A mesma ferramenta não grava `page_url` nem `conversation_excerpt`, por isso o painel mostra "Contexto não capturado neste chamado".
3. Em `create_support_ticket`, a chamada à função de geração é fire-and-forget sem `EdgeRuntime.waitUntil`, então pode ser interrompida quando a resposta é devolvida — risco de tickets normais também travarem em `pending`.

## O que será feito

1. **`create_roadmap_item` passa a capturar contexto**: gravar `page_url` e `conversation_excerpt` no insert, iguais ao fluxo de chamados de suporte.
2. **Geração do prompt para itens de roadmap**: após inserir, disparar `generate-ticket-dev-prompt`; em caso de falha de disparo, marcar `dev_prompt_status = 'failed'` com a mensagem de erro, para o botão "Regerar" ficar disponível de imediato.
3. **Extrair um helper compartilhado** (`triggerDevPrompt`) usado por `create_support_ticket`, `create_roadmap_item` e a criação via `generate_dev_prompt`, mantendo o comportamento de marcar `pending` → `ready`/`failed`.
4. **Manter a invocação viva** com `EdgeRuntime.waitUntil` no disparo em background, evitando o cancelamento silencioso.
5. **Regularizar os chamados já travados**: gerar o prompt dos tickets #1036, #1038 e #1039 (ou marcá-los como `failed` para permitir "Regerar" na hora).
6. **Deploy** da edge function `ai-assistant`.

## Detalhes técnicos

- Arquivos: `supabase/functions/ai-assistant/tools.ts` (helper + duas ferramentas), sem mudança de schema.
- `supabase/functions/generate-ticket-dev-prompt/index.ts` permanece como está — ele já funciona (tickets #1030–#1034 têm prompt `ready`).
- Nenhuma alteração de RLS ou de UI é necessária: `SupportInbox.tsx` já trata `pending` obsoleto (>2 min) e exibe o botão "Regerar".
