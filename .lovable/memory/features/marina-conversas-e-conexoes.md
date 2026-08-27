---
name: Conversas e conexões da Marina
description: Assunto em vez da primeira frase, conversas fixadas, resumo acumulado para contexto e divisão por assunto do fio do WhatsApp; catálogo de conexões do motor
type: feature
---

Tudo o que é configurado na Marina vale igualmente para o chat no Arrow e para o WhatsApp — o WhatsApp é uma interface de extensão do Arrow, não um canal separado.

## Conversas (`ai_conversations`)

Colunas: `channel` (`marina_web` | `whatsapp`), `subject`, `title_locked`, `pinned_at`, `summary`, `summary_until`, `last_message_at`, `message_count`.

- A lista lateral mostra o **assunto** (`subject`), nunca a primeira frase. O assunto é gerado por LLM rápida após a primeira troca e reavaliado a cada ~8 mensagens.
- Renomear à mão marca `title_locked = true`; o assunto automático nunca sobrescreve isso.
- Fixar conversa = `pinned_at`; a lista mostra bloco "Fixadas" no topo.
- Histórico fica íntegro em `ai_messages`. O contexto enviado ao motor é **resumo acumulado + últimas ~12 mensagens** (`_shared/marinaContext.ts` → `buildContext`), atualizado a cada ~10 mensagens novas por `refreshConversationState`.

## WhatsApp dividido por assunto

`resolveWhatsappConversation` decide, a cada mensagem recebida, se continua a conversa ativa (silêncio ≤ 180 min + mesmo tema segundo LLM classificadora) ou abre nova conversa com `channel = 'whatsapp'`. `channel_identities.conversation_id` sempre aponta para o assunto ativo. Para a pessoa no WhatsApp o fio continua único.

## Conexões

`supabase/functions/marina-chat/connectors.ts`: tenta descobrir as conexões nativas do motor (`/connectors`, `/integrations`, `/mcp/servers`, `/tools`) e cai para catálogo curado. As credenciais são enviadas ao motor (`set_connector_credential`) e **nunca** guardadas no banco do Arrow; só o estado da conexão fica em `ai_external_connectors` com `kind = 'engine'`.
