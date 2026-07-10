# Marina como canal de suporte + investigação do bug do Marketing

## Parte A — Canal de suporte Marina → Super Admin

### Banco de dados
Nova tabela `support_tickets`:
- `user_id`, `company_id`, `user_role`, `user_name`, `user_email`
- `category` (`bug` | `feature_request` | `question` | `complaint` | `other`)
- `priority` (`low` | `medium` | `high` | `critical`) — sugerida pela Marina
- `title`, `description` (resumo estruturado)
- `conversation_excerpt` JSONB (últimas mensagens relevantes)
- `page_url`, `user_agent` (contexto técnico)
- `status` (`open` | `in_review` | `in_progress` | `resolved` | `wont_fix`)
- `resolved_at`, `resolved_by`, `admin_notes`

Tabela `support_ticket_messages` para thread de respostas entre Super Admin ↔ usuário.

RLS + GRANTs:
- Autenticado: cria/lê os próprios tickets e mensagens.
- Super Admin: lê/edita todos, responde.
- Trigger de notificação in-app em criação (para todos super_admins) e em resposta (para autor).

### Tools da Marina (`supabase/functions/ai-assistant/tools.ts`)
Disponíveis para **todas as roles**:
- `create_support_ticket({ title, description, category, priority?, include_last_messages? })` — grava ticket com contexto de tela (rota já vem no payload), retorna número.
- `list_my_tickets({ status? })` — lista tickets do usuário atual.

Fluxo no `systemPrompt` (`index.ts`): quando o usuário relatar erro/bug/reclamação/pedido de melhoria, Marina deve (1) fazer 1–2 perguntas objetivas, (2) confirmar o resumo, (3) chamar `create_support_ticket`, (4) devolver o número e avisar que o Super Admin foi notificado.

### Inbox do Super Admin
Nova rota `/super-admin/support-inbox`:
- Filtros (status, prioridade, categoria, empresa, usuário, data).
- Detalhe: dados do autor, contexto técnico (rota/UA), excerto da conversa com a Marina, thread de mensagens, mudança de status, notas internas.
- Badge de contagem `open` no menu lateral do Super Admin.
- Item adicionado à sidebar (`src/components/super-admin/...`).

### Visão do usuário
- Botão "Meus chamados" no rodapé do painel da Marina (`AIChat.tsx`) abre lista simplificada com status e respostas.

### Notificações
- Tipos `support_ticket_created` (para super_admin) e `support_ticket_reply` (para autor), plugados no sino existente.
- E-mail/WhatsApp ficam para onda 2 (respeita a preferência já registrada: in-app primeiro).

## Parte B — Marketing não recebeu resposta da Marina

Isso não é escopo de UI, é bug. Antes de mudar código, preciso confirmar a causa. Investigação em ordem:

1. **Edge function logs** de `ai-assistant` filtrando por `userRole: "marketing"` no horário do incidente — procurar 402 (créditos esgotados no gateway), 429 (rate limit), 500, timeout ou stack de tool.
2. **Frontend**: verificar se o `useAIChat` está capturando erros e exibindo toast — hoje o fluxo de stream engole falha silenciosa se a resposta vier vazia; adicionar toast + mensagem inline "Não consegui responder agora, tente novamente" quando o assistant terminar com `content` vazio.
3. **Role**: `marketing` já está no catálogo de tools e no `normalizeRole`; não é filtro de permissão. Confirmar via log que `userRole` chegou como `marketing` e não como algo tipo `undefined`.
4. **Créditos Lovable AI**: se for 402, orientar a recarregar créditos.

Correção provável (independente da causa raiz):
- No `useAIChat.ts`, tratar `assistant` com `content === ''` no fim do stream como erro visível (toast + mensagem no chat).
- No `ai-assistant/index.ts`, garantir que qualquer path de erro retorne JSON com `error` amigável em vez de 500 silencioso.

## Entregáveis desta onda
1. Migration `support_tickets` + `support_ticket_messages` (RLS, grants, trigger de notificação).
2. Tools `create_support_ticket` e `list_my_tickets` + atualização do system prompt.
3. Página `/super-admin/support-inbox` + item na sidebar + badge de pendentes.
4. Botão "Meus chamados" dentro do chat da Marina.
5. Hardening do `useAIChat` e do `ai-assistant` para nunca falhar em silêncio.
6. Diagnóstico dos logs do incidente do Marketing e correção pontual, se apontar algo além do (5).

## Fora de escopo
- Envio automático de tickets por e-mail/WhatsApp (Onda 2).
- Kanban / SLA / atribuição a múltiplos admins.

Aprova?
