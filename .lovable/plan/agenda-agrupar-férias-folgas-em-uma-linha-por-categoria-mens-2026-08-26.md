# Agenda: agrupar férias/folgas em uma linha por categoria (mensal e semanal)

## Objetivo

Hoje cada ausência/sobreaviso vira um cartão próprio (1 linha por pessoa). Agrupar por categoria na **visão mensal e na semanal**: uma linha "Férias · Pedro Alves, Caio Reis", uma linha "Folga · Romulo, Gabriel Anjos, Adriano Moura" etc. Serviços externos (OS/Auvo de embarcação) continuam um cartão por item.

Comparação com o dia 24 (print enviado):

```text
ANTES (8 linhas de RH)            DEPOIS (2-3 linhas)
Férias · Pedro Alves              Férias · Pedro A., Caio R.
Folga · Romulo                    Folga · Romulo, Gabriel A., Adriano M.
Férias · Caio Reis      -->
Folga · Gabriel Anjos
Folga · Adriano Moura
...
```

## O que será feito

### 1. Agrupamento por categoria no dia (mensal + semanal)
- Em `MonthView.tsx` e `WeekView.tsx`, os itens do dia são separados em dois blocos:
  - `orders`: cartões de serviço externo (categoria `os` ou `auvo`), como hoje, ordenados por horário.
  - `absenceGroups`: um item por categoria presente no dia (`Férias`, `Folga`, `Atestado`, `Treinamento`, `Sobreaviso`, `Reservado`, `Indisponível`), com a lista de pessoas.
- Entram no grupo tanto as ausências/sobreavisos do RH (`technician_absences`, `technician_on_call`) quanto tarefas do Auvo classificadas como ausência (ex.: tarefa "Férias / Vega Chaser" já é classificada como `vacation` pelo `classifyEvent`) — hoje elas viram cartões de "order"; passam a alimentar o grupo da categoria, usando os nomes da equipe da tarefa.

### 2. Renderização da linha agrupada
- Uma linha única com o badge da categoria (ícone + label) e os primeiros nomes separados por vírgula, com `truncate` se estourar a largura; cores/ícone vêm de `categoryStyles` (mesma identidade da legenda).
- Tooltip (`title`) com a lista completa de nomes do grupo.
- Clique na linha abre o diálogo "Atividades do dia" (lista completa, com clique individual por pessoa) — a linha representa várias pessoas, então não abre detalhe de uma só.
- Exceção: grupo com **uma única pessoa** mantém o clique direto no detalhe (`onScheduleEntryClick`), como hoje.

### 3. Orçamento de altura e "+N"
- O "+N" passa a contar **linhas** (cartões de serviço + grupos de RH), não pessoas — coerente com o que se vê na célula.
- A sonda de medição (`probeRef`) mede também a linha agrupada (mais baixa que o cartão de serviço), para o cálculo de `maxVisible` ficar correto nas duas visões.

### 4. Diálogo "Atividades do dia"
- Sem mudança: continua listando cada pessoa individualmente com clique para o detalhe.

## Detalhes técnicos

- Novo helper compartilhado (em `eventStyles.ts` ou `groupAbsences.ts` na mesma pasta): `groupScheduleEntries(entries)` → `{ serviceOrders, groups: [{ category, label, entries }] }`, usado pelas duas visões.
- `src/components/admin/calendar/MonthView.tsx` e `WeekView.tsx`: separação dos blocos, renderização da linha de grupo, clique (diálogo do dia ou detalhe quando 1 pessoa), ajuste do probe de altura e do contador "+N".
- Sem mudança de schema, RLS, hooks de dados ou na visão de dia.
