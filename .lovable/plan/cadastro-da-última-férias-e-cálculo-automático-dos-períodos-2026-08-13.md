# Cadastro da última férias e cálculo automático dos períodos

## Situação atual (verificada)

- `hr_vacation_periods`: 73 períodos, 35 colaboradores (34 perfis com data de admissão). Colunas de cálculo já existem: início/fim do aquisitivo, limite concessivo (23 meses), direito, usados, abono, proporcional, férias vencidas, situação.
- O período é criado por gatilho **apenas a partir da data de admissão** (`create_initial_vacation_period`): cria um único período (admissão → +12 meses, limite +23 meses). Não gera os ciclos seguintes.
- `hr_vacation_grants` existe com 15 registros (vindos da importação) e **não é usada em nenhuma tela** — não há como cadastrar, editar ou ver a última férias gozada.
- `proporcional_meses` é preenchido por gatilho só quando vem nulo, medindo meses do início do aquisitivo até hoje.
- A aba "Períodos Aquisitivos" é somente leitura (sem ações de criar/editar).

Conclusão: falta exatamente o que você pediu — registrar a última férias e, a partir dela, encadear/atualizar os períodos aquisitivos com direito, proporcional e limites.

## O que será construído

### 1. Cadastro de "Última Férias" (histórico de gozo)

Nova ação na tela de Férias (aba Períodos Aquisitivos e no dossiê do colaborador): **Registrar última férias**.

Campos: colaborador, início e fim do gozo, dias gozados (calculado, editável), dias vendidos (abono), data de pagamento, observações. Também permite editar e excluir um registro já lançado.

Uma lista/histórico por colaborador mostra as férias já gozadas.

### 2. Recálculo automático dos períodos

Ao salvar (ou remover) uma última férias, o sistema:

- vincula o gozo ao período aquisitivo correspondente (o período que contém o início do gozo; se não houver, cria o ciclo faltante);
- soma dias gozados + abono nesse período e ajusta a situação (aberto / parcialmente usado / totalmente usado);
- **encadeia os ciclos seguintes** a partir dos aniversários da admissão até hoje: cada ciclo com início, fim (12 meses), limite concessivo (23 meses do início) e direito de 30 dias;
- calcula, para o ciclo em curso, o **proporcional de meses** (meses completos desde o início do aquisitivo, teto 12) e o **direito proporcional** exibido na tela;
- marca **férias vencidas** quando o limite concessivo passou com saldo em aberto;
- exibe o **limite de início de gozo** = limite concessivo menos os dias a gozar (semáforo já existente: vermelho vencido/≤90 dias, âmbar ≤180).

### 3. Ajustes na tela

- Aba "Períodos Aquisitivos": colunas de limite de início de gozo e última férias gozada; botão de recalcular período; ações de registrar/editar última férias por linha.
- Aba nova (ou seção) "Histórico de Gozo": lista de `hr_vacation_grants` com filtro por colaborador e ano.
- Quando o colaborador não tem período algum, botão "Gerar períodos" a partir da admissão.

### 4. Marina

Ferramentas para consultar o histórico de gozo e registrar a última férias em nome do colaborador, com o mesmo recálculo — reaproveitando a resolução de nome já existente.

## Detalhes técnicos

- Migração: função `SECURITY DEFINER` `hr_vacation_rebuild_periods(_employee_id uuid)` que gera/atualiza os ciclos a partir de `profiles.hire_date` (idempotente por `employee_id + period_start`), aplica os gozos de `hr_vacation_grants` e as solicitações em gozo/concluídas nos `used_days`/`sold_days`, recalcula `proporcional_meses`, `ferias_vencidas` e `status`. Gatilho `AFTER INSERT/UPDATE/DELETE` em `hr_vacation_grants` chamando essa função.
- Correção em `hr_vacation_recompute_period`: hoje seleciona `period_id` de `hr_vacation_periods` (coluna inexistente nessa tabela) no caminho de fallback — passa a usar `id`.
- `hr_vacation_grants` já tem RLS; conferir políticas de escrita para RH/diretoria/super_admin e `GRANT` do papel autenticado antes de expor o CRUD.
- Frontend: `src/hooks/useVacations.ts` ganha `useVacationGrants` (listar/criar/editar/excluir) e mutação de recálculo via RPC; novos componentes `src/components/hr/vacations/GrantDialog.tsx` e `GrantsTable.tsx`; `PeriodsTable.tsx` recebe as novas colunas e ações; `src/pages/hr/Vacations.tsx` liga a nova aba.
- Datas sempre com `parseISO`/construtor local; nada de `new Date('YYYY-MM-DD')`.
- Marina: novas ferramentas em `supabase/functions/ai-assistant/tools.ts` (`query_vacation_grants`, `register_vacation_grant`) e regra correspondente no prompt.

## Ordem de execução

1. Migração (função de reconstrução, gatilho, correção do fallback, políticas/grants).
2. Hook + diálogo de cadastro de última férias.
3. Colunas/ações na aba de períodos e aba de histórico.
4. Ferramentas da Marina e deploy.
