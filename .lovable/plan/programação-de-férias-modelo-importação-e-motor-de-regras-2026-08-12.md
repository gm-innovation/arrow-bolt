# Programação de Férias — modelo, importação e motor de regras

O sistema já tem uma base de férias: períodos aquisitivos (35 registros, criados automaticamente na admissão), solicitações (0 registros até agora), aprovações em duas etapas (gestor → RH) e a tela `/hr/vacations` com saldo por colaborador. O plano estende essa base em vez de criar tabelas paralelas — mantendo o padrão de nomes já usado no RH (`hr_vacation_*`) e o vínculo com `profiles` como cadastro de colaboradores.

## O que muda no modelo de dados

**Períodos aquisitivos** (`hr_vacation_periods`) ganham: `company_id`, data de vencimento, indicador de férias vencidas, meses proporcionais, dias de abono já usados, observações de regra especial (ex.: "Férias somente em rescisão") e marca de origem de importação.

**Programações de férias** (`hr_vacation_requests`) ganham: número da parcela, dias de abono, mês de referência (texto original + data normalizada), data de pagamento ao financeiro, indicador de financeiro notificado e marca de importação. O fluxo de status atual (rascunho → gestor → RH → aprovado) é mantido e complementado com "em gozo" e "concluída".

**Histórico de concessões** (nova tabela `hr_vacation_grants`): os gozos já realizados — a seção "Última Férias" da planilha — com datas, dias, abono e data de pagamento. Programações concluídas caem aqui automaticamente.

**Regras da empresa** (nova tabela `hr_vacation_rules`, uma linha por empresa) com os valores da Lecsor: divisão de férias não permitida, 1 parcela, máximo 10 dias de abono, máximo 3 férias por mês, 1 técnico simultâneo, tolerância de sobreposição de 7 dias, notificar financeiro sempre. Editável pelo RH/Diretoria, sem valores fixos no código.

**Log de conflitos** (nova tabela `hr_vacation_conflicts`): cada validação violada é registrada com tipo, descrição, colaborador conflitante e, quando houver, a autorização de exceção (quem liberou e por quê) — atendendo o caso "divisão de férias mediante justificativa aprovada pela diretoria".

**Auditoria**: reaproveita o padrão de auditoria já existente no RH, via gatilho, para programações e períodos.

## Motor de validação

Ao criar ou aprovar uma programação, o sistema avalia e registra:

- mais de 3 férias no mesmo mês na empresa;
- mais de 1 técnico de férias no mesmo mês (tolerância de sobreposição de até 7 dias);
- tentativa de dividir férias quando a empresa não permite;
- abono acima do limite;
- programação depois da data-limite de gozo;
- colaborador desligado/afastado.

Cada bloqueio pode ser liberado como exceção por diretoria/RH, com motivo obrigatório e registro no log.

### Períodos aquisitivo e concessivo (CLT)

- **Período aquisitivo:** 12 meses a partir da admissão (ou do aniversário do período anterior) — ex.: admissão 16/05/2023 → aquisitivo 16/05/2025 a 15/05/2026.
- **Período concessivo:** a partir do fim do aquisitivo, mas limitado a **23 meses contados do início do aquisitivo** (nunca 24). As férias precisam terminar até esse limite — ex.: início aquisitivo 16/05/2025 → último dia para terminar as férias = **15/04/2027** (completaria 24 meses em 16/05/2027, então o limite é um dia antes, 15/04/2027).
- **Limite p/ gozo** (coluna da planilha): último dia em que as férias podem **começar**, isto é, o limite de 23 meses menos a quantidade de dias da própria gozação. Para gozo de 30 dias a partir de 17/03/2027, o limite de início cai em 16/04/2027 — exatamente o valor da planilha para o Adriano. O sistema calculará os dois: `limite_concessivo` (23 meses do início aquisitivo) e `limite_inicio_gozo`.
- **Férias vencidas:** passou do limite concessivo (23 meses) com saldo em aberto (gera pagamento em dobro).

Campos calculados pelo sistema (nunca digitados): fim do período concessivo, limite de início de gozo, quantidade de dias, saldo, meses proporcionais, férias vencidas e status do período.


## Importação da planilha

33 linhas principais + 16 linhas de continuação (segundo período aquisitivo). Tratamento:

- linhas de continuação são agrupadas ao colaborador da linha anterior e viram um segundo período aquisitivo;
- `..../..../.....` e células vazias viram "não programado" (nulo);
- `00/01/1900` (Pedro Elias) é recalculado a partir do fim do período aquisitivo;
- mês de referência é normalizado (`Jan/27`, `dezembro-26`, `Outurbro`, `Agosto` → data do primeiro dia do mês) preservando o texto original;
- anotações dentro da célula ("a acordar", "01/03/2027 a confirmar", "Férias somente em rescisão") vão para observações;
- "Fer. pro." (`08/12`, `4/12`) vira número de meses proporcionais;
- seção "Última Férias" entra no histórico de concessões;
- todos os registros marcados como origem de importação.

Casamento de colaborador: os 5 sem código na planilha (Augusto Azarias, Isis Santos Costa, Kaike Neves Ancelme, Thais Martins Silva Lopes, Thiago de Assis Simão) já existem no cadastro por nome — serão associados por nome normalizado. **Ponto de atenção:** Thais Martins Silva Lopes tem dois registros no cadastro (um sem data de admissão) — vai para o relatório de inconsistências para o RH decidir, sem duplicar dados.

Os períodos criados automaticamente na admissão que coincidirem com os da planilha são atualizados (não duplicados); a chave é colaborador + início do período aquisitivo, então a importação pode ser reexecutada sem duplicar.

## Tela de Programação de Férias

Nova aba "Programação" em `/hr/vacations`:

- **Calendário anual**: linha por colaborador, meses como colunas, barras de férias programadas/gozadas, com destaque de meses saturados (3 férias) e de conflito entre técnicos;
- **Lista de períodos**: colaborador, admissão, período aquisitivo, vencimento, limite de gozo, saldo, status, com filtros por setor/status e alertas de vencimento próximo;
- **Programar férias**: escolhe período, datas, abono (limitado pela regra), mostra os conflitos detectados antes de salvar e permite pedir exceção com justificativa;
- **Histórico**: últimas férias gozadas por colaborador;
- **Configuração de regras**: painel para RH/Diretoria ajustar os limites;
- **Financeiro**: campo de data de pagamento e marcação de envio ao financeiro nas férias aprovadas.

O portal do colaborador (`/corp`) passa a mostrar seus períodos, saldo e programação, e a solicitar férias com justificativa.

## Detalhes técnicos

- Migrações: `ALTER TABLE` em `hr_vacation_periods` e `hr_vacation_requests`; `CREATE TABLE` para `hr_vacation_grants`, `hr_vacation_rules`, `hr_vacation_conflicts` — cada uma com GRANT explícito, RLS habilitado e políticas por `company_id` + papéis (`hr`, `director`, `super_admin` gerenciam; colaborador vê o próprio).
- Novos enums para status de período/programação (extensão dos enums `vacation_period_status` e `vacation_request_status` existentes) e `vacation_conflict_type`.
- Funções `SECURITY DEFINER` para o motor de validação (`hr_vacation_check_conflicts`) e para recalcular saldos/status (gatilho em programações).
- Datas sempre com construtor local / `parseISO`, nunca `new Date('YYYY-MM-DD')`.
- Importação via script de parsing do CSV + inserções idempotentes, com relatório final de inconsistências.
- Frontend: expandir `src/hooks/useVacations.ts` e `src/pages/hr/Vacations.tsx`, novos componentes em `src/components/hr/vacations/`.

## Ordem de execução

1. Migração do modelo (colunas, tabelas novas, RLS, enums, funções).
2. Importação da planilha + relatório de inconsistências.
3. Motor de regras e conflitos.
4. Tela de programação (calendário, lista, diálogo de programação, regras, histórico).
5. Portal do colaborador e integração com o financeiro.
