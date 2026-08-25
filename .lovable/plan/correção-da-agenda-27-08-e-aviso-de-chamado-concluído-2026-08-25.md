# Correção da agenda 27/08 e aviso de chamado concluído

## Diagnóstico confirmado

1. **O dia 27/08 está vazio no Arrow, mas há dados futuros em outros dias.** Conferência no banco: `service_orders` tem 3 itens em 25/08, 34 em 26/08, **0 em 27/08** e 4 em 28/08. A imagem enviada confirma o mesmo comportamento visual: 26 e 28 aparecem, 27 fica em branco.
2. **O problema não é que o Arrow não mostra datas futuras em geral.** Ele já exibe 26/08 e 28/08; o bug específico é que os agendamentos do Auvo de 27/08 não foram sincronizados/reconciliados para a agenda do Arrow.
3. **As tarefas Auvo locais ainda não cobrem o futuro.** `auvo_tasks` só tem registros até 25/08; para 26/08, 27/08 e 28/08 há 0 tarefas Auvo armazenadas. Portanto, se o Auvo tem Vega Chaser e FPSO Cidade de Maricá em 27/08, esses dados ainda não chegaram ao banco local.
4. **A agenda atual é baseada principalmente em OS.** `ServiceCalendar` consulta `service_orders.scheduled_date` e usa `auvo_tasks` apenas para enriquecer OSs já carregadas. Se uma atividade do Auvo não tiver OS vinculada, ou se a OS não tiver sido criada/reconciliada, ela não aparece no calendário.
5. **Chamados de suporte** já têm aviso na abertura, mas a tela `/super-admin/support-inbox` apenas atualiza `support_tickets.status`; não há trigger de conclusão para avisar a pessoa que abriu o chamado.

## O que será feito

### 1. Trazer agendamentos futuros do Auvo
- Ajustar a rotina agendada do Auvo para buscar uma janela que inclua dias futuros, não só `hoje - 7` até hoje.
- Janela proposta: últimos 7 dias até próximos 60 dias, suficiente para a agenda operacional sem tornar a função pesada.
- Preservar os blocos quinzenais para evitar timeout.
- Depois da alteração, disparar uma sincronização imediata para cobrir 27/08 e validar se Vega Chaser e FPSO Cidade de Maricá entram no banco local.

### 2. Reconciliar o Auvo com a agenda do Arrow
- Quando uma tarefa Auvo tiver número de OS, vincular/enriquecer a `service_orders` correspondente e atualizar `scheduled_date`, embarcação, equipe, cliente e escopo quando esses campos vierem mais completos no Auvo.
- Quando uma tarefa Auvo não tiver OS vinculada, mantê-la visível como evento próprio do Auvo na agenda, sem criar uma OS falsa.
- Evitar duplicidade: se a tarefa Auvo já estiver ligada a uma OS, o calendário mostra apenas o evento da OS enriquecido.

### 3. Exibir eventos Auvo sem OS na agenda
- `ServiceCalendar` passa a carregar também `auvo_tasks` do período visível.
- Eventos sem `service_order_id` aparecem com identificação visual própria, título/embarcação, cliente/local, equipe e horário quando disponível.
- Clique em evento Auvo abre um modal local de detalhes do Auvo dentro da agenda, sem navegar para `/admin/orders`.
- `MonthView`, `WeekView`, `DayView` e `DayEventsDialog` passam a contabilizar OSs e eventos Auvo no mesmo `+N` clicável.

### 4. Avisar por WhatsApp quando o chamado for concluído
- Criar disparo automático quando `support_tickets.status` mudar para `resolved`/concluído.
- A Marina envia WhatsApp para o usuário que abriu o chamado com número, título, status concluído, resumo da solução/notas quando houver e link do chamado.
- Usar o mesmo canal de notificações existente (`notify-dispatch` + fila `whatsapp_outbox`) e manter fallback para notificação no app.
- Garantir idempotência para não reenviar a mesma conclusão em duplicidade.

## Detalhes técnicos

- **Banco:** alterar a função de agendamento do sync Auvo para aceitar `p_future_days`; criar/ajustar trigger de conclusão em `support_tickets`; adicionar tipo de notificação `support_ticket_resolved` se ainda não existir.
- **Backend:** revisar `auvo-sync` para persistir tarefas futuras e chamar a reconciliação após o lote; ajustar `notify-dispatch` para formatar/enviarem WhatsApp de chamados concluídos.
- **Frontend:** alterar `ServiceCalendar.tsx` para unir eventos de `service_orders` e `auvo_tasks` sem OS; ajustar `MonthView`, `WeekView`, `DayView`, `DayEventsDialog`, `CalendarLegend` e o modal de detalhes Auvo.
- **Segurança:** manter RLS por `company_id`; não expor dados sensíveis de perfil. A leitura de telefone para WhatsApp deve continuar pelo backend/função de notificação, não pelo cliente.

## Validação

1. Rodar sync futuro do Auvo e confirmar registros de 27/08 em `auvo_tasks`.
2. Confirmar que a agenda de 27/08 exibe Vega Chaser e FPSO Cidade de Maricá.
3. Confirmar que 26/08 e 28/08 continuam aparecendo como hoje, sem duplicação.
4. Clicar em um evento Auvo sem OS abre detalhe local da agenda.
5. Concluir um chamado de teste e validar que a pessoa que abriu recebe a mensagem da Marina no WhatsApp.
