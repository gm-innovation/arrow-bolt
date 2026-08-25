# Correção da agenda de serviços com dados do Auvo

## Diagnóstico confirmado

1. A agenda atual (`ServiceCalendar`) monta os eventos a partir de `service_orders`, `tasks` e `service_visits`.
2. O clique em um serviço chama `navigate('/admin/orders?id=...')`, por isso o detalhamento sai da agenda e abre a página de Ordem de Serviço.
3. A equipe exibida na agenda vem de visitas/tarefas locais; o campo `Equipe; ...` extraído do Auvo já existe na tabela `auvo_tasks.team_name`, mas não entra na consulta da agenda.
4. Na visão semanal, há um limite fixo de 5 OSs por dia (`MAX_VISIBLE = 5`) e o restante aparece como texto não clicável `mais +N`.
5. Para 26/08/2026 existem 40 OSs em `service_orders`; 40 estão sem horário (`service_date_time`) e 10 ainda sem embarcação vinculada. Isso explica a concentração de itens sem hora e parte dos nomes incompletos.

## O que será feito

### 1. Abrir detalhes dentro da própria agenda
- Trocar o clique do evento para abrir um modal local na agenda.
- Reutilizar o componente de detalhes de OS já existente, para manter abas como Detalhes, Visitas, Auvo e Histórico.
- Manter a navegação para a página de OS fora desse fluxo; clicar na agenda não deve redirecionar.

### 2. Usar a equipe do Auvo quando não houver equipe local
- Buscar, em lote, as tarefas Auvo vinculadas às OSs carregadas no calendário.
- Para cada OS, consolidar `team_name` extraído do texto `Equipe; ...`.
- Exibir essa equipe como fallback quando `service_visits`/`tasks` não tiverem técnicos vinculados.
- Mostrar a equipe também no hover/modal da agenda, não apenas na aba Auvo do detalhe.

### 3. Corrigir o “mais +38” e permitir ver todos
- Substituir o texto redundante por `+38` ou `38 mais`, sem duplicidade.
- Transformar esse indicador em botão clicável.
- Ao clicar, abrir um modal/lista do dia com todas as atividades de 26/08 (ou do dia selecionado), incluindo OS, embarcação, cliente, status e equipe.
- Cada item dessa lista abrirá o mesmo modal local de detalhes da agenda.

### 4. Melhorar o aproveitamento de espaço da coluna
- Remover o corte rígido de 5 itens na visão semanal.
- Calcular a quantidade visível de forma mais generosa e responsiva, usando o espaço disponível da coluna.
- Reduzir a altura/ruído visual dos itens compactos para caber mais OSs sem perder leitura.
- Manter overflow controlado para não quebrar o layout em telas menores.

### 5. Sinalizar dados ainda defasados
- Onde a embarcação ainda vier como “Sem embarcação”, usar fallback do Auvo quando disponível (`vessel_name_parsed`/`vessel_name`).
- Se nem a OS nem o Auvo tiverem embarcação, manter “Sem embarcação” para indicar dado realmente ausente.
- Não alterar regras de negócio ou sincronização de Omie/Auvo nesta etapa; o foco é a agenda e a visualização dos dados já disponíveis.

## Detalhes técnicos

- `src/components/admin/calendar/ServiceCalendar.tsx`
  - Adicionar estado `selectedOrderId` e modal local com `ViewOrderDetailsDialog`.
  - Trocar `handleEventClick` para `setSelectedOrderId(orderId)`.
  - Buscar `auvo_tasks` por `service_order_id in (...)` após carregar OSs.
  - Mapear `team_name`, `vessel_name_parsed` e `vessel_name` por OS.

- `src/components/admin/calendar/WeekView.tsx`
  - Remover `MAX_VISIBLE = 5` fixo.
  - Tornar o indicador de restantes clicável e sem texto redundante.
  - Receber callback `onDayOverflowClick(day)` para abrir a lista completa do dia.

- `src/components/admin/calendar/MonthView.tsx` e `ServiceOrderListItem.tsx`
  - Usar fallback de equipe Auvo no display dos técnicos.
  - Garantir que itens e detalhes usem os mesmos dados consolidados.

- Novo componente pequeno, se necessário: `DayEventsDialog`
  - Lista todos os eventos do dia e encaminha cada item para o modal local da OS.

## Validação

1. Abrir agosto/2026 na agenda.
2. Em 26/08, o indicador de excedentes deve ser clicável e abrir a lista completa das 40 OSs.
3. Clicar em qualquer OS deve abrir os detalhes dentro da agenda, sem navegar para `/admin/orders`.
4. OSs com `Equipe; ...` no Auvo devem exibir os nomes dos técnicos mesmo sem visita local vinculada.
5. Confirmar que o layout não corta informações em desktop e continua utilizável em telas menores.
