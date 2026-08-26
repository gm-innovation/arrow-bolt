# Visão mensal: agrupar férias/folgas em uma linha por categoria

## Objetivo

Hoje cada ausência/sobreaviso vira um cartão próprio na célula do dia (1 linha por pessoa). Em vez disso, agrupar por categoria: uma única linha "Férias · Pedro Alves, Caio Reis", uma linha "Folga · Romulo, Gabriel Anjos, Adriano Moura" etc. Serviços (OS/Auvo) continuam um cartão por item.

Comparação com o dia 24 (print enviado):

```text
ANTES (8 linhas de RH)            DEPOIS (3 linhas)
Férias · Pedro Alves              Férias · Pedro A., Caio R.
Folga · Romulo                    Folga · Romulo, Gabriel A., Adriano M.
Férias · Caio Reis      -->       Sobreaviso · Fulano
Folga · Gabriel Anjos
Folga · Adriano Moura
...
```

## O que será feito

### 1. Agrupamento por categoria no dia
- Em `MonthView.tsx`, `getEntriesForDay` passa a retornar dois blocos:
  - `orders`: cartões de OS/Auvo, como hoje (ordenação por horário).
  - `absenceGroups`: um item por categoria ativa no dia (`Férias`, `Folga`, `Atestado`, `Treinamento`, `Sobreaviso`, `Reservado`, `Indisponível`), cada um com a lista de pessoas.
- Ausências e sobreavisos do RH + tarefas de ausência vindas do Auvo (que já viram `order` classificado como vacation/day_off/...) são unificadas no mesmo grupo da categoria.

### 2. Renderização da linha agrupada
- Linha única com o badge da categoria (ícone + label) e os primeiros nomes separados por vírgula, com `truncate` se estourar a largura.
- Clique na linha abre o diálogo "Atividades do dia" já existente (lista completa e clicável por pessoa) — não abrimos um detalhe por pessoa porque a linha representa várias.
- Tooltip/hover nativo (`title`) com a lista completa de nomes do grupo.

### 3. Orçamento de altura e "+N"
- O "+N" passa a contar **linhas** (cartões de serviço + grupos de RH), não pessoas — coerente com o que se vê.
- A sonda de medição (`probeRef`) mede a linha agrupada (altura menor, 1 linha de texto), recalculando `maxVisible` corretamente.

### 4. Diálogo "Atividades do dia"
- Sem mudança estrutural: continua listando cada pessoa individualmente com clique para o detalhe (`ScheduleEntryDetailsDialog`).

## Detalhes técnicos

- `src/components/admin/calendar/MonthView.tsx`: novo tipo `AbsenceGroup { category, entries: DayEntry[] }`; separação de `entries` em `orderEntries` + `absenceGroups`; renderização de grupo com `categoryStyles[category]` (badge + nomes via `formatShortName`); clique do grupo chama `onDayOverflowClick?.(day)`; ajuste do probe de altura.
- Sem mudança de schema, RLS, hooks de dados ou nas visões semanal/dia.
