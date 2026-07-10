## Diagnóstico

A falha não está no chat em si. O chamado é criado em `support_tickets`, mas o gatilho automático que deveria avisar o Super Admin tenta inserir em `notifications` usando colunas que não existem mais: `type` e `link`.

A tabela real usa:
- `notification_type`
- `reference_id`

Além disso, os tipos `support_ticket_created` e `support_ticket_reply` ainda não existem no enum de notificações.

## Plano de correção imediata

1. **Corrigir o backend de notificações dos chamados**
   - Adicionar os tipos de notificação faltantes:
     - `support_ticket_created`
     - `support_ticket_reply`
   - Recriar as funções:
     - `notify_support_ticket_created()`
     - `notify_support_ticket_message()`
   - Trocar os inserts antigos em `notifications(type, link, ...)` por `notifications(notification_type, reference_id, ...)`.

2. **Corrigir rota de acompanhamento do usuário**
   - Ajustar a notificação de resposta do Super Admin para apontar conceitualmente para `/account/tickets`, não para a rota inexistente `/account/support`.
   - Como `notifications` não possui coluna `link`, a navegação continuará sendo feita pelo frontend conforme `notification_type` e `reference_id`.

3. **Ajustar navegação do sino de notificações**
   - Quando a notificação for `support_ticket_created`, enviar Super Admin para `/super-admin/support-inbox`.
   - Quando for `support_ticket_reply`, enviar usuário para `/account/tickets`.

4. **Testar o fluxo completo**
   - Criar chamado pela ferramenta da Marina.
   - Confirmar que o registro aparece em `support_tickets`.
   - Confirmar que a notificação é criada para Super Admin.
   - Confirmar que respostas do Super Admin geram notificação para o usuário.

## Resultado esperado

A Marina voltará a abrir chamados sem a mensagem “column notifications.type does not exist”, e o Super Admin receberá o chamado na Inbox de Suporte.