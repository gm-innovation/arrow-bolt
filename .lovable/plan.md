# Plano — Contexto da conversa + Prompt de correção automático

## Parte 1 — Por que "Conversa com Marina (contexto)" aparece vazia (`[]`)

**Diagnóstico (confirmado por leitura):**

- Em `supabase/functions/ai-assistant/tools.ts:1053`, o ticket grava `conversation_excerpt = ctx.conversationExcerpt`.
- Em `supabase/functions/ai-assistant/index.ts:172`, isso é preenchido com `conversationHistory?.slice(-8)`.
- Em `src/hooks/useAIChat.ts:301`, o cliente envia `messages: messages.map(...)` — que é o estado **anterior** ao envio (a mensagem atual do usuário e a resposta da Marina que dispara `create_support_ticket` ainda não estão no array).
- Resultado: quando o usuário abre o chamado logo nas primeiras trocas (caso do ticket #1003, aberto direto na página `/hr/absences`), o array chega vazio e é salvo como `[]`.

**Correção:**

1. Em `useAIChat.ts`, enviar também a mensagem atual do usuário (`currentUserMessage`) num campo separado do payload — sem alterar a lógica de `messages` que alimenta o modelo.
2. Em `ai-assistant/index.ts`, montar `conversationExcerpt` como `[...conversationHistory.slice(-8), { role: "user", content: currentUserMessage }]` ao passar para `toolCtx`. Assim o excerto sempre carrega o gatilho do chamado.
3. Em `tools.ts` (`create_support_ticket`), após inserir o ticket, chamar a Parte 2 (geração do prompt) de forma assíncrona — não bloqueia a resposta ao usuário.

## Parte 2 — Prompt de correção gerado por IA em cada ticket

**Objetivo:** ao abrir qualquer chamado, um agente interpreta título+descrição+contexto e produz um "prompt de desenvolvimento" pronto para colar no Lovable, descrevendo o que criar/corrigir. Fica visível apenas na Inbox do Super Admin.

**Banco (migration):**
- `support_tickets`: adicionar colunas
  - `dev_prompt text` — prompt gerado
  - `dev_prompt_status text default 'pending'` — pending | ready | failed
  - `dev_prompt_generated_at timestamptz`
  - `dev_prompt_model text`
  - `suggested_area text` — módulo alvo (RH, Comercial, SGQ, etc.), inferido pela IA
  - `suggested_files jsonb` — lista de arquivos/rotas prováveis, inferida por keyword-match no lado da função

**Edge Function `generate-ticket-dev-prompt`:**
- Trigger: chamada pela `ai-assistant` logo após o insert do ticket (fire-and-forget) e por botão manual "Regerar prompt" na Inbox.
- Input: `ticket_id`.
- Lógica:
  1. Carrega o ticket (título, descrição, categoria, prioridade, `page_url`, `conversation_excerpt`, `user_role`).
  2. Usa Lovable AI Gateway (`google/gemini-2.5-flash`) com system prompt fixo pedindo saída JSON: `{ suggested_area, suggested_files[], dev_prompt }`.
  3. `dev_prompt` segue template: contexto do bug/pedido, comportamento esperado, passos de reprodução, arquivos prováveis, critérios de aceite — em pt-BR, tom instrucional para o agente Lovable.
  4. Grava as colunas e marca `dev_prompt_status='ready'` (ou `'failed'` com mensagem).
- Registrada em `supabase/config.toml` com `verify_jwt = true`; permite chamada por `service_role` a partir da `ai-assistant`.

**Backfill:** rodar a função uma vez para tickets existentes com `dev_prompt is null` (script `psql` chamando via `curl` a edge function, ou botão "Gerar para todos" na Inbox).

**UI — `src/pages/super-admin/SupportInbox.tsx`:**
- Nova seção no painel de detalhe do ticket, acima do "Conversa com Marina (contexto)":
  - Título "Prompt sugerido para correção"
  - Badge com `dev_prompt_status` e `suggested_area`
  - Bloco `<pre>` com o `dev_prompt` (ou skeleton enquanto `pending`)
  - Botões: **Copiar prompt** (clipboard), **Regerar** (chama a edge function)
  - Lista de `suggested_files` como chips clicáveis (só copiam o caminho).
- Fica visível apenas nesta página (não aparece em `/account/tickets`).

**Fluxo final:**
1. Usuário reporta bug → Marina chama `create_support_ticket` com `conversation_excerpt` já corrigido.
2. `create_support_ticket` insere o ticket e dispara `generate-ticket-dev-prompt` sem esperar resposta.
3. Segundos depois, na Inbox, o Super Admin abre o ticket e vê o prompt pronto para colar no Lovable.

## Detalhes técnicos

- Não altero `notifications`, `ai_conversations`, nem policies existentes de `support_tickets` (as SELECT/UPDATE do super_admin já cobrem as novas colunas).
- `GRANT`: as novas colunas herdam os grants da tabela; não precisa novo GRANT.
- Modelo: Gemini 2.5 Flash via Lovable AI Gateway (barato/rápido, sem custo direto de API).
- Segurança: a função valida que o chamador é `service_role` (invocação da `ai-assistant`) ou usuário com papel `super_admin` (botão "Regerar" na Inbox).
- Falha na geração não bloqueia a criação do ticket; status `failed` é mostrado com botão de retry.
