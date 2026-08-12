# Corrigir data de admissão no Histórico do colaborador

## O que está errado (confirmado no banco)

Na ficha do Adriano, a aba Pessoal mostra "Na empresa desde 16/05/2023" (correto, vem de `hire_date`), mas o Histórico mostra "05/01/2026 → 12/08/2026 · Admissão". São dois problemas encadeados:

1. **Marco de Admissão com data errada.** Os 34 registros de "Admissão" foram criados antes da importação da planilha, quando `hire_date` ainda estava vazio — então o gatilho usou a data de criação do cadastro. Resultado: nenhum dos 34 colaboradores com data de admissão preenchida tem o marco batendo com a `hire_date` real.
2. **Movimentação fantasma de 12/08/2026.** Quando a importação preencheu setor/função, o gatilho de movimentações interpretou isso como uma mudança de cargo real: fechou o marco de Admissão em 12/08/2026 e abriu um segundo registro "12/08/2026 → atual" com a função TEC.EM ELETRONICA III. Na prática o colaborador ocupa essa função desde a admissão, não desde ontem.

## Correção proposta

**1. Consolidar o marco de Admissão (correção de dados)**
Para cada um dos 34 colaboradores importados:
- Trazer setor, função, cargo e gestor do registro fantasma para dentro do registro de Admissão.
- Ajustar a data inicial do marco de Admissão para a data de admissão real da ficha.
- Reabrir o marco como período vigente (sem data de término) e apagar o registro fantasma de 12/08/2026.

Resultado no Histórico do Adriano: uma única linha "16/05/2023 → atual · Admissão · Setor: Técnico · Função: TEC.EM ELETRONICA III".

**2. Manter o marco alinhado quando a admissão for corrigida depois**
Hoje, se o RH ajustar a data de admissão de alguém, o marco de Admissão continua com a data antiga. Vou fazer o marco de Admissão acompanhar automaticamente a data de admissão da ficha.

**3. Não gerar movimentação quando só se completa um cadastro vazio**
Passar a registrar movimentação apenas quando houver troca real (de um valor preenchido para outro). Sair de "vazio" para o primeiro valor passa a atualizar o próprio marco de Admissão, sem criar linha nova.

**4. Colaboradores sem data de admissão**
24 cadastros não têm data de admissão (não vieram na planilha). O marco deles continua com a data de criação do cadastro; a ficha vai sinalizar isso como pendência para o RH preencher.

## Detalhes técnicos

- Correção de dados via tool de dados (`UPDATE`/`DELETE`) em `hr_employee_assignments`, casando os pares por `employee_id`: linha com `change_reason = 'Admissão'` + linha sem `change_reason` criada em 2026-08-12 14:36.
- Migração ajustando `hr_track_assignment_changes()`: só cria nova linha quando `OLD.<campo>` não é nulo/vazio; quando o valor anterior é vazio, faz `UPDATE` da linha vigente (`valid_to IS NULL`) preenchendo os campos `new_*`.
- Nova função + trigger `AFTER UPDATE OF hire_date ON profiles` que sincroniza `valid_from` da linha `change_reason = 'Admissão'` do colaborador.
- `hr_seed_initial_assignment()` já usa `COALESCE(NEW.hire_date, ...)` — sem alteração.
- Frontend: incluir "data de admissão não informada" na lista de pendências já existente em `EmployeeDetailSheet.tsx`.
