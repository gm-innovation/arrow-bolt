# Agenda: origem dos dados e coluna que não rola

## De onde vêm as atividades

A agenda monta cada dia a partir de **duas fontes**:

1. **Ordens de Serviço do Arrow** (tabela de OSs) — são os cartões que aparecem **com o número da OS** no badge (ex.: `5518 Tantalus Tide`, `5559 Sem embarcação`). Na prática, hoje quase todas vêm do **espelhamento do Omie** (verificado: as OSs de 24 e 25/08 têm identificador do Omie).
2. **Tarefas do Auvo** (tabela de tarefas sincronizadas) — são os cartões com badge **"Auvo"**. Só entram na agenda as tarefas que **não** estão vinculadas a uma OS na mesma data (para não duplicar).
3. Além disso, férias/folgas/sobreaviso vêm dos cadastros de ausências e escalas do RH.

Ou seja: badge com número = OS (Omie/Arrow); badge "Auvo" = tarefa do Auvo sem OS correspondente naquela data.

Verificado no banco para os dias das imagens: 24/08 tem 2 OSs + 15 tarefas Auvo; 25/08 tem 3 OSs (uma sem embarcação) + 13 tarefas Auvo, mais ausências. Também existem **2 OSs de teste** ("[QA] Navio E2E", números 94811/94812) agendadas em 25/08 que sujam a visão.

## Por que a coluna do dia 24 estoura sem mostrar "+N"

Na visão semanal o cálculo de quantos itens cabem assume **30 px por cartão**, mas o cartão real tem duas linhas (título + técnicos), ~46-50 px. Resultado: o código acha que cabem ~14 itens, renderiza todos, o "+N" nunca é calculado como necessário e o excedente é simplesmente **cortado** pelo `overflow-hidden` — sem rolagem e sem botão.

Agravante: férias, folgas e sobreaviso são renderizados **depois** do botão "+N", então consomem altura sem entrar na conta corretamente.

## O que será feito

1. **Medir a altura real do cartão** em vez de usar 30 px fixos (medição do primeiro item renderizado, com fallback), e recalcular no `ResizeObserver` já existente.
2. **Contar todos os eventos do dia** (OSs + Auvo + ausências + sobreaviso) num único orçamento de altura, ordenados por horário, e mostrar `+N atividades` para tudo que sobrar — abrindo o diálogo do dia já existente.
3. Permitir **rolagem interna da coluna** como rede de segurança, para nunca haver conteúdo cortado invisível.
4. Aplicar a mesma correção de contagem na visão **Mês** (mesmo padrão de orçamento/`+N`).
5. Deixar o diálogo "+N" listando o dia completo (já suporta as duas fontes), com o badge de origem visível.
6. **Ocultar/limpar as OSs de teste** "[QA] Navio E2E" da agenda (filtro por marcação de teste ou remoção dos registros de QA, conforme sua preferência).

## Detalhes técnicos

- `src/components/admin/calendar/WeekView.tsx`: unificar os três arrays em uma lista `dayEvents` ordenada, altura de item medida via `ref` + `getBoundingClientRect`, `+N` sempre no fim, coluna com `overflow-y-auto`.
- `src/components/admin/calendar/MonthView.tsx`: mesmo orçamento unificado.
- `src/components/admin/calendar/DayEventsDialog.tsx`: garantir que receba ausências/sobreaviso além das OSs.
- Sem mudanças de schema; a origem de cada cartão continua vindo de `event_source` (`arrow` vs `auvo`).
