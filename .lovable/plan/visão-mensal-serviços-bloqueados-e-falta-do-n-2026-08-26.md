# Visão mensal: serviços "bloqueados" e falta do "+N"

## Diagnóstico

Os itens apagados/inclicáveis não são só férias e folgas — são também cartões de serviço (OS e Auvo), como no recorte com "Auvo / Marcio Mendes", "Auvo / Jose Eduardo e Cristiano" e "Auvo / Wagner Viana".

Duas causas ligadas, ambas na `MonthView`:

1. **A célula do dia não limita mais o conteúdo.** Na correção anterior o `overflow-hidden` da célula foi removido para o botão "+N" não ser cortado. Com isso, quando o dia tem mais itens do que a altura da linha da semana, o excedente **escapa da célula** e é pintado por baixo das células vizinhas/da linha seguinte, que têm fundo próprio. O resultado visual é exatamente o "meio apagado" e, como o elemento de cima recebe o clique, o cartão fica **inclicável** — inclusive OS e Auvo, não só ausências.
2. **O corte é por contagem, não por espaço.** O limite é fixo (`4` normal / `12` ampliado). Enquanto o dia tiver até 12 eventos, todos são renderizados e o "+N" nunca aparece, mesmo que não caibam. Foi por isso que só o dia 28 (com mais de 12) mostrou "+1 atividades" e os dias 25, 26 e 27 não mostraram nada.

Complementarmente, ausências e sobreavisos do RH continuam sem clique nem hover na visão de mês (renderizados como `div` sem `onClick`), o que reforça a sensação de item "morto".

## O que será feito

### 1. Nada mais escapa da célula
- A célula do dia volta a conter o conteúdo, com altura definida por linha e o excedente nunca vazando para cima de outra célula.
- A linha do "+N" fica reservada dentro da célula (fixa no rodapé), então ela não é cortada.
- Rolagem interna na célula como rede de segurança, para nunca haver item invisível/inalcançável.

### 2. "+N" por espaço real, não por contagem
- Altura de item medida no DOM (mesma técnica já usada na visão semanal) e recalculada com `ResizeObserver`.
- Um único orçamento por dia com OS + Auvo + ausências + sobreaviso, ordenado por horário; tudo que não cabe entra no "+{N} atividades", que abre o diálogo do dia já existente com a lista completa.
- Remoção do limite fixo 4/12.

### 3. Todos os itens clicáveis
- Cartões de OS e Auvo mantêm clique (detalhe da OS / detalhe da tarefa Auvo) e hover.
- Ausências e sobreavisos passam a ter `cursor-pointer`, hover e clique, abrindo o detalhe do registro (colaborador, tipo, período, observação).
- Mesmo comportamento no diálogo "Atividades do dia".

## Detalhes técnicos

- `src/components/admin/calendar/MonthView.tsx`: substituir `MAX_VISIBLE_ORDERS` fixo por orçamento de altura (item medido via `ref` + `getBoundingClientRect`); célula com altura/`max-h` definida, lista interna com `overflow-y-auto` e botão "+N" fora da área rolável (rodapé da célula); unificar OS + ausências + sobreaviso em uma lista `dayEntries` ordenada por horário; adicionar `onClick`/hover aos itens de RH.
- `src/components/admin/calendar/ServiceCalendar.tsx`: estado e diálogo para detalhe de ausência/sobreaviso, com handler repassado a `MonthView`, `WeekView` e `DayEventsDialog`.
- `src/components/admin/calendar/WeekView.tsx` e `DayEventsDialog.tsx`: reaproveitar o mesmo handler para ausências/sobreaviso.
- Sem mudança de schema, RLS ou de regras de sincronização Auvo/Omie — apenas UI e apresentação.
