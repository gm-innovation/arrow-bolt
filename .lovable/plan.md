# Resposta no chamado + triagem por IA

Hoje `/account/tickets` (`src/pages/account/MyTickets.tsx`) só mostra as respostas do Super Admin — o usuário não consegue responder. A tabela `support_ticket_messages` e as RLS já permitem que o dono do ticket insira mensagens; falta a UI e a lógica de análise da resposta.

## O que muda para o usuário (`/account/tickets`)

- Cada chamado passa a exibir a **thread completa** (mensagens do usuário + do Super Admin em ordem cronológica), com bolhas diferenciadas por `is_admin`.
- Abaixo do histórico, um bloco **"Responder"** com textarea + botão "Enviar":
  - Só aparece se `status !== 'resolved'` e `!== 'wont_fix'` (nesses casos, mostrar botão "Reabrir com nova solicitação").
  - Ao enviar: `insert` em `support_ticket_messages` (`is_admin = false`, `author_role` do perfil) e chamada da nova Edge Function `triage-ticket-reply` (fire-and-forget) para análise.
- Após envio, invalida a query `my-support-tickets` para refletir a nova mensagem e o eventual novo ticket derivado.
- Notificação para o Super Admin: novo tipo `support_ticket_user_reply` (trigger na inserção quando `is_admin = false`), rota `/super-admin/support-inbox` (adicionar em `src/lib/notificationRoutes.ts`).

## Triagem por IA da resposta do usuário

Nova Edge Function `supabase/functions/triage-ticket-reply/index.ts` (Gemini 2.5 Flash via Lovable AI):

1. Recebe `{ ticket_id, message_id }`.
2. Carrega o ticket original (title/description/category) + últimas mensagens da thread.
3. Prompt pede JSON estruturado:
   ```json
   {
     "intent": "confirmation" | "still_broken" | "new_request" | "clarification",
     "resolved_ok": boolean,
     "new_ticket": null | { "title", "description", "category", "priority" },
     "summary": string
   }
   ```
4. Ações conforme `intent`:
   - `confirmation` + `resolved_ok=true` → marca `status = 'resolved'`, `resolved_at = now()`, grava mensagem-sistema "Usuário confirmou resolução".
   - `still_broken` → volta `status` para `open` (se estava `resolved`) e adiciona nota "Usuário reportou que ainda não está corrigido".
   - `new_request` → cria **novo ticket** (`support_tickets`) com os campos sugeridos, `user_id` = dono do ticket original, `conversation_excerpt` referenciando o ticket-pai; adiciona mensagem-sistema no ticket original ("Nova solicitação detectada: #NNNN") e no novo ticket ("Derivado de #MMMM"). Dispara `generate-ticket-dev-prompt` para o novo ticket (já existente).
   - `clarification` → nenhuma ação de estado; só registra a `summary` em `admin_notes` (append).
5. Toda ação de IA salva em `ai_assistant_actions` (auditoria já existente).

Registrar a função em `supabase/config.toml` com `verify_jwt = true`.

## O que muda para o Super Admin (`/super-admin/support-inbox`)

- Renderiza a thread completa (não só respostas do admin) com marcação visual de "mensagens do usuário".
- Badge/aviso quando a IA detectou `new_request` — link para o ticket derivado.
- Filtro/ordenação por "aguardando resposta do super admin" (última mensagem com `is_admin = false`).

## Arquivos afetados

- `src/pages/account/MyTickets.tsx` — thread + composer + reabrir.
- `src/pages/super-admin/SupportInbox.tsx` — thread completa + link para tickets derivados.
- `src/lib/notificationRoutes.ts` — rota para `support_ticket_user_reply`.
- `supabase/functions/triage-ticket-reply/index.ts` — nova função.
- `supabase/config.toml` — registrar função.
- Migration:
  - Novo valor no enum `notification_type`: `support_ticket_user_reply`.
  - Trigger `notify_support_ticket_user_reply` em `support_ticket_messages` (quando `is_admin = false`) notificando super admins.
  - Coluna opcional `parent_ticket_id uuid` em `support_tickets` (FK self, `ON DELETE SET NULL`) para rastrear tickets derivados.

## Pontos a confirmar

Prossigo com o plano acima; se preferir, posso limitar a criação automática de novo ticket apenas a uma **sugestão** (Super Admin aprova antes de virar ticket) em vez de criar direto.
