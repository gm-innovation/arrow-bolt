# Agenda com dados futuros do Auvo + aviso de chamado concluído

## Diagnóstico confirmado

1. **A sincronização do Auvo nunca busca datas futuras.** A função agendada `invoke_auvo_sync` monta a janela como `hoje - 7 dias` até **hoje**. Confirmado no banco: a maior `task_date` em `auvo_tasks` é **25/08/2026**, e não existe nenhuma tarefa para 26/08 ou 27/08. Ou seja, agendamentos futuros do Auvo (como as férias do Vega Chaser e o FPSO Cidade de Maricá em 27/08) simplesmente não chegam ao Arrow.
2. **A agenda só desenha OSs locais.** `ServiceCalendar` consulta `service_orders` (mais visitas/tarefas) e usa `auvo_tasks` apenas como enriquecimento (equipe/embarcação) das OSs já existentes. Em 27/08 não há nenhuma OS com `scheduled_date` nessa data (0 registros), então a coluna fica vazia.
3. **Tarefas Auvo sem OS ficam invisíveis.** De 2.155 tarefas Auvo, 80 não têm `service_order_id`. Atividades do tipo férias/bloqueio de agenda normalmente não têm número de OS e, mesmo depois de importadas, não apareceriam na agenda pelo desenho atual.
4. **Chamados de suporte** já avisam na abertura (trigger `notify_support_ticket_created`), mas não existe nada disparado na conclusão: o status é alterado direto pela tela `/super-admin/support-inbox` e nenhum trigger observa a mudança para `resolved`/`closed`.

## O que será feito

### 1. Sincronizar também o futuro do Auvo
- A janela do sync agendado passa a cobrir retroativo **e** futuro (ex.: de 7 dias atrás até 60 dias à frente), para que agendamentos ainda não realizados apareçam na agenda.
- Manter o mesmo modo de blocos quinzenais já usado, para não estourar o tempo da função.
- Rodar uma sincronização imediata da janela futura, de forma que 26/08 e 27/08 sejam preenchidos assim que a mudança subir.

### 2. Mostrar na agenda as atividades que só existem no Auvo
- A agenda passa a carregar, para o período visível, as tarefas do Auvo pela data agendada — inclusive as que não têm OS vinculada.
- Tarefas com OS vinculada continuam sendo o evento da OS (sem duplicar), apenas com equipe/embarcação vindas do Auvo, como já é hoje.
- Tarefas sem OS aparecem como um evento próprio, visualmente distinto (etiqueta "Auvo"), com título, cliente/embarcação quando existir, equipe e horário.
- Clique nesses eventos abre um detalhamento dentro da própria agenda, com os dados do Auvo (sem redirecionar para a página de OS, que não existiria para esses casos).
- Legenda do calendário ganha a marcação do novo tipo de evento; os contadores e o `+N` clicável passam a considerar esses eventos.

### 3. Marina avisa no WhatsApp quando o chamado é concluído
- Ao mudar um chamado para concluído/resolvido, quem abriu recebe um aviso da Marina no WhatsApp com número, título, resumo da solução (notas administrativas quando houver) e link para o chamado.
- O aviso segue o mesmo caminho já usado na abertura do chamado (fila de saída + envio imediato), respeitando as preferências de canal do usuário; se a pessoa não tiver WhatsApp, cai no aviso no app.
- Envio idempotente: reabrir e concluir de novo não reenvia o mesmo aviso duplicado para a mesma transição.

## Detalhes técnicos

- **Banco:** atualizar `invoke_auvo_sync` para aceitar dias à frente e passar `period_end` futuro; novo trigger `AFTER UPDATE` em `support_tickets` disparando quando `status` entra em `resolved`/`closed`, com função `SECURITY DEFINER` que insere a notificação e chama o despacho. Novo valor `support_ticket_resolved` no enum `notification_type`.
- **Edge Functions:** `notify-dispatch` passa a rotear `support_ticket_resolved` por WhatsApp (mesma lógica de `support_ticket_created`), com texto em pt-BR e link do Arrow.
- **Frontend:** `src/components/admin/calendar/ServiceCalendar.tsx` (nova consulta de `auvo_tasks` por `task_date` no período + união dos eventos), `MonthView.tsx`, `WeekView.tsx`, `DayView.tsx`, `DayEventsDialog.tsx`, `CalendarLegend.tsx` e um item/dialog para o evento Auvo sem OS. Sem mudança de regra de negócio nos módulos de OS.
- **Segurança/tipos:** leitura de `auvo_tasks` continua sob as políticas atuais por empresa; tipos dos novos eventos declarados explicitamente no componente da agenda.

## Validação

1. Após o sync, `auvo_tasks` passa a ter registros com `task_date` de 26/08 e 27/08.
2. Na agenda de 27/08 aparecem as atividades do Auvo (férias Vega Chaser, FPSO Cidade de Maricá), com equipe visível.
3. Nenhum evento duplicado para OSs que já existiam no Arrow.
4. Concluir um chamado de teste dispara o aviso no WhatsApp de quem abriu, com número e link.
