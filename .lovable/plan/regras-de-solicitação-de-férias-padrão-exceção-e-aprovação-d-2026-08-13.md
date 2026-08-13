# Regras de solicitação de férias: padrão, exceção e aprovação da Diretoria

## Padrões aceitos (sem exceção)

- 30 dias de gozo, sem venda de dias.
- 20 dias de gozo + venda de 10 dias (abono).

Nesses dois casos o fluxo é o normal: sem justificativa obrigatória e sem etapa extra de aprovação.

## Exceção (qualquer combinação diferente)

Qualquer outra combinação de dias de gozo e venda é exceção e exige:
- **Justificativa obrigatória** — o botão de registrar fica desabilitado sem texto.
- **Autorização da Diretoria** — a solicitação segue para aprovação da diretoria depois do gestor/RH, e fica sinalizada como exceção na lista de solicitações.

Limites que continuam valendo em qualquer cenário:
- Primeira parcela do período aquisitivo: mínimo de 14 dias corridos.
- Parcelas seguintes: mínimo de 5 dias corridos.
- Venda de dias: no máximo 10 dias.

## No modal de férias

Ao informar o período, o sistema classifica o pedido e mostra o resultado em uma linha:
- "Solicitação padrão: 30 dias de gozo" ou "Solicitação padrão: 20 dias de gozo + 10 dias de abono".
- "Exceção — depende de autorização da Diretoria" quando fugir do padrão, com o campo Justificativa marcado como obrigatório e o motivo explicado.

O bloco de dias restantes continua perguntando o que fazer com o saldo (programar depois ou vender, limitado a 10 dias), e a escolha entra na classificação.

## Fluxo de aprovação

A solicitação de exceção ganha um estágio de diretoria: após a aprovação do gestor (ou direto do RH quando não há gestor), ela fica pendente de diretoria; `director` e `super_admin` aprovam ou rejeitam pela mesma tela de Solicitações. Pedidos padrão seguem o fluxo atual sem essa etapa.

## Paridade com a Marina

`request_vacation` aplica a mesma classificação: identifica padrão x exceção, exige justificativa na exceção (perguntando o motivo quando faltar), respeita os mínimos de 14/5 dias e o teto de 10 dias de abono, e avisa na resposta quando a solicitação vai depender de autorização da Diretoria. `decide_vacation_request` passa a aceitar o estágio de diretoria. O bloco FÉRIAS do prompt é atualizado com essas regras.

## Detalhes técnicos

- Migração: novo valor `pending_director` no enum `vacation_request_status` e coluna booleana `is_exception` em `hr_vacation_requests` (com `director_id` / `director_decided_at` seguindo o padrão das colunas de gestor e RH já existentes).
- `src/pages/hr/Vacations.tsx` (`NewRequestDialog`): função de classificação `classifyRequest(days, sellDays)` retornando `{ isStandard, isException, minDays, requiresJustification }`; usa `useVacationRequests(employeeId)` filtrado pelo `period_id` do período automático e status ativo para decidir entre mínimo de 14 ou 5 dias; `canSubmit` passa a exigir justificativa nas exceções.
- Roteamento de status na criação: exceção → `pending_manager` (ou `pending_hr` sem gestor) e depois `pending_director`; padrão mantém o comportamento atual, incluindo o registro já aprovado quando criado pelo RH.
- `src/hooks/useVacations.ts`: `useDecideVacationRequest` ganha o estágio `director`; badges e filtros da aba Solicitações reconhecem `pending_director` e o selo de exceção.
- `supabase/functions/ai-assistant/tools.ts` e `index.ts`: mesma classificação em `request_vacation`, novo estágio em `decide_vacation_request` e regras no prompt.
