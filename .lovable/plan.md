# Visão mensal: itens não clicáveis e "+N" ausente

## O que a leitura do código mostrou

1. **Itens não clicáveis.** Na visão de mês só as atividades vindas de OS/Auvo recebem clique e hover: elas são renderizadas com `onClick` e `HoverCard`. Os itens de **ausência (Férias, Folga, Atestado, Indisponível, Treinamento)** e de **sobreaviso** vindos do RH são renderizados como `div` puro, sem `onClick`, sem `cursor-pointer` e sem hover — por isso parecem "mortos". O mesmo vale na visão semanal.
2. **"+N" ausente.** O corte na visão de mês é por **contagem fixa** (`MAX_VISIBLE_ORDERS = 4` normal / `12` ampliado), não pelo espaço real da célula. Consequência: enquanto o dia tem até 12 eventos, todos são renderizados e o "+N" nunca aparece — mesmo que não caibam visualmente na célula. O dia 28 da sua imagem mostra "+1 atividades" justamente porque passou de 12; os dias 25, 26 e 27 ficam abaixo do limite e por isso não têm botão, ainda que a célula estoure.
3. Como as células crescem com o conteúdo, um dia cheio esticando a linha inteira desalinha o mês; o botão "+N" hoje também não tem posição garantida no fim da pilha.

## O que será feito

### 1. Tudo clicável na visão de mês (e semana)
- Ausências e sobreavisos passam a ser clicáveis, com `cursor-pointer` e hover, abrindo um detalhe do registro (colaborador, tipo, período e observação).
- Manter OS/Auvo abrindo os diálogos que já existem (detalhe da OS e detalhe da tarefa Auvo).
- Aplicar o mesmo comportamento no diálogo "Atividades do dia", onde ausências também são apenas texto hoje.

### 2. "+N" baseado no espaço real, não em contagem
- Altura de item medida no próprio DOM (como já feito na semana) e altura útil da célula fixada, reservando sempre a linha do "+N".
- O "+N atividades" aparece sempre que sobrar qualquer evento — OS, Auvo, ausência ou sobreaviso — num único orçamento por dia, ordenado por horário.
- Célula com rolagem interna como rede de segurança, para nunca existir conteúdo cortado invisível.
- Linhas do mês com altura consistente, para um dia cheio não esticar a semana inteira.

## Detalhes técnicos

- `src/components/admin/calendar/MonthView.tsx`: substituir `MAX_VISIBLE_ORDERS` fixo por orçamento de altura (item medido via `ref` + `getBoundingClientRect`, célula com `max-h` e `ResizeObserver`); unificar OS + ausências + sobreaviso numa lista `dayEntries` ordenada por horário; "+N" sempre no fim com `mt-auto`; adicionar `onClick`/hover nos itens de RH.
- `src/components/admin/calendar/ServiceCalendar.tsx`: novo estado/diálogo para detalhe de ausência/sobreaviso e handler `onAbsenceClick` repassado a `MonthView`, `WeekView` e `DayEventsDialog`.
- `src/components/admin/calendar/WeekView.tsx`: reaproveitar o mesmo handler para ausências/sobreaviso.
- `src/components/admin/calendar/DayEventsDialog.tsx`: itens de RH viram botões clicáveis.
- Sem mudança de schema, RLS ou de regras de sincronização Auvo/Omie — apenas UI e apresentação.
