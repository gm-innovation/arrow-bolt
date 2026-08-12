# Programação e Aprovação de Férias em /hr/vacations

Reformular a tela de férias para operar como a planilha da Lecsor (programação anual por colaborador) e ligar o motor de conflitos, que hoje existe no banco mas nunca é executado.

## Situação atual (verificada)

- Dados importados: 73 períodos aquisitivos (72 abertos, 1 expirado), 13 programações (todas com status "aprovado"), 15 registros históricos de gozo.
- A tela `/hr/vacations` tem apenas: cards de contagem, tabela de solicitações com aprovação Gestor → RH, e uma lista de períodos limitada a 20 linhas.
- O motor de conflitos (`hr_vacation_check_conflicts`) existe, mas **não está ligado a nenhum gatilho** — nunca rodou, e a tabela de conflitos está vazia.
- Regras cadastradas por empresa: máx. 3 férias/mês, máx. 1 técnico simultâneo, abono máx. 10 dias, antecedência 30 dias, sem parcelamento.
  Observação: você citou "2 técnicos/mês"; hoje a regra está em 1. Ela é configurável — vou expor na tela de regras e deixo o valor como você definir (mantendo 1 se não houver ajuste).
- Nada exibe: proporcional de meses, flag de férias vencidas, prazo de 23 meses, ou o histórico de última férias.

## O que será construído

### 1. Tela com quatro abas

**Programação (visão anual)**
- Grade colaborador × 12 meses do ano selecionado, com barras nos meses de gozo programado.
- Realce de meses saturados (acima do limite de férias/mês) e de choque entre técnicos.
- Filtros: ano, cargo/função, situação do período, apenas pendências.

**Solicitações**
- Tabela atual mantida (fluxo Gestor → RH), com colunas novas: período aquisitivo vinculado, prazo limite de gozo, dias de abono, alertas de conflito.
- Badge de conflito por linha, com detalhe do motivo ao clicar.

**Períodos Aquisitivos**
- Lista completa, paginada e com busca (sem o corte de 20 linhas).
- Colunas: período, proporcional de meses, direito, usados, abono, saldo, limite de gozo (23 meses), férias vencidas, situação.
- Semáforo: vermelho para vencido/limite em menos de 90 dias, âmbar até 180 dias.

**Regras**
- Formulário das regras da empresa (férias/mês, técnicos simultâneos, abono máximo, antecedência, parcelamento, tolerância de sobreposição), visível para RH e Diretoria.

### 2. Motor de conflitos ativo

- Gatilho no banco que roda a checagem a cada inserção/alteração de programação e regrava os conflitos daquela programação.
- Validações cobertas: sobreposição de datas do mesmo colaborador, limite de técnicos simultâneos, limite de férias por mês, abono acima do permitido, gozo depois do limite de 23 meses, período/colaborador inativo.
- Ao criar uma solicitação, a tela mostra os conflitos detectados antes de confirmar.
- RH pode registrar exceção com justificativa (o conflito fica marcado como resolvido, com motivo e autor).

### 3. Validação contra os dados importados

Rodar a checagem sobre as 13 programações existentes e apresentar o resultado numa faixa de resumo na aba Programação ("X programações com conflito"), permitindo revisão caso a caso.

## Detalhes técnicos

- `hr_vacation_check_conflicts(_programacao_id)` passa a ser chamada por gatilho `AFTER INSERT OR UPDATE` em `hr_vacation_requests` (campos de data, dias, abono, status), com limpeza dos conflitos não resolvidos antes de reinserir.
- Novo hook `useVacationConflicts` e extensão de `useVacations.ts` com: períodos paginados, regras (`hr_vacation_rules` leitura/gravação), grade anual derivada das programações aprovadas.
- Novos componentes em `src/components/hr/vacations/`: `VacationYearGrid`, `PeriodsTable`, `ConflictBadge`, `VacationRulesForm`, `ConflictExceptionDialog`.
- `src/pages/hr/Vacations.tsx` passa a ser um contêiner de abas, sem lógica de tabela embutida.
- Datas sempre com `parseISO`; nenhuma coluna nova é criada — as tabelas atuais já cobrem tudo.
