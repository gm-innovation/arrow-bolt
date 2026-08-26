# Sábados e domingos na agenda

## O que a verificação mostrou

Duas causas independentes, ambas confirmadas no banco e no código:

1. **Falta de dados históricos de fim de semana.** Os fins de semana no Auvo são compostos quase só por FÉRIAS, SOBREAVISO, FOLGA, INDISPONÍVEL, ATESTADO e VIAGEM. No banco do Arrow, esses tipos só existem a partir de **19/08/2026** (180 registros, até 07/10). Antes dessa data a sincronização gravava apenas tarefas de atendimento técnico e descartava as de agenda/ausência — por isso 01, 02, 08 e 09/08 estão totalmente vazios e 15/08 e 16/08 têm só visitas técnicas. Dos dias 22, 23, 29 e 30 em diante os registros existem (8, 8, 6 e 7 itens).
2. **Corte visual na visão de mês.** Cada célula mostra no máximo **3** itens e a célula tem `overflow-hidden` com altura mínima fixa; o botão "+N atividades" acaba sendo cortado. Além disso o modo tela cheia não repassa o limite ampliado (só o modo "expandido" faz isso), então mesmo em tela cheia o dia 23/08 exibe 3 dos 8 itens e sem "+5".

## O que será feito

### 1. Recuperar o histórico de fins de semana
Rodar a sincronização do Auvo para o período já coberto (a partir de ~junho/2026) agora que as tarefas de agenda/ausência são persistidas, de forma que sábados e domingos passados apareçam com férias, folgas, sobreaviso, atestados e viagens como no Auvo.

### 2. Corrigir a exibição da visão de mês
- Passar o limite ampliado também no modo tela cheia (não só no modo expandido).
- Elevar o limite por dia e garantir que o botão "+N atividades" nunca seja cortado: a célula deixa de esconder o excedente e reserva a linha do "+N".
- Manter o orçamento único (OS + Auvo + RH) já usado hoje, para o "+N" refletir o total real do dia.

Fim de semana continua com as mesmas regras já acordadas: só entra o que está agendado no Auvo naquela data, e trabalho interno (bancada/laboratório) segue fora da agenda.

## Detalhes técnicos

- `supabase/functions/auvo-sync/index.ts`: já grava todas as tarefas via `upsertTask` antes do filtro `isServiceTask` (o filtro só limita o cross-check). Nenhuma mudança de código é necessária — apenas reexecutar o sync do período histórico.
- `src/components/admin/calendar/ServiceCalendar.tsx`: `<MonthView isExpanded={isExpanded || isFullscreen} />`.
- `src/components/admin/calendar/MonthView.tsx`: aumentar `MAX_VISIBLE_ORDERS` (ex.: 4 normal / 12 ampliado), trocar `overflow-hidden` por `overflow-visible`/`min-h` adequado na célula e renderizar o "+N" sempre ao final da pilha.
- Sem alteração de schema, de RLS ou dos hooks de OS/ausências.
