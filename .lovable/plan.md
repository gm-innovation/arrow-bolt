# Regra dos 14 dias e justificativa obrigatória no pedido de férias

Hoje o modal exige apenas 5 dias corridos por solicitação e a justificativa é opcional. As regras corretas:

## Como vai funcionar

**Primeira parcela do período aquisitivo** (nenhuma outra solicitação ativa vinculada àquele período):
- Menos de 14 dias: bloqueado, com a mensagem de que a primeira parcela precisa ter no mínimo 14 dias corridos.
- 14 dias ou mais: liberado.

**Parcelas seguintes** (já existe solicitação ativa no mesmo período aquisitivo):
- Mínimo de 5 dias corridos.

**Justificativa obrigatória quando o pedido for menor que 30 dias.** O campo passa a ser exigido e o rótulo explica o motivo: justificar a divisão das férias ou a venda dos dias. Sem texto, o botão fica desabilitado.

**Política interna** (mantida como aviso, não como bloqueio, pois o colaborador tem direito de solicitar):
- Empresa não divide férias: aviso de que a solicitação parcial depende de avaliação do RH.
- Venda de dias limitada a 10: a opção "Vender os dias" sempre grava no máximo 10 dias de abono e mostra o limite; os dias que sobrarem além disso ficam de saldo para programar depois.

O resumo do modal mostra em uma linha: dias de gozo, dias restantes, destino do restante e qual regra de mínimo se aplica (14 dias por ser a primeira parcela, ou 5 dias por ser parcela seguinte).

## Paridade com a Marina

`request_vacation` aplica exatamente as mesmas regras antes de gravar: identifica se é a primeira parcela do período aquisitivo, valida 14/5 dias, exige justificativa quando o pedido for menor que 30 dias (pedindo o motivo ao usuário quando faltar) e limita o abono a 10 dias. O bloco FÉRIAS do prompt da Marina é atualizado com essas regras.

## Detalhes técnicos

- `src/pages/hr/Vacations.tsx` (`NewRequestDialog`): usar `useVacationRequests(employeeId)` filtrado por `period_id === autoPeriod.id` e status ativo (`draft`, `pending_manager`, `pending_hr`, `approved`, `em_gozo`) para saber se é a primeira parcela; substituir `belowMinimum` por `minDays` (14 ou 5) e adicionar `justificationRequired = days > 0 && days < 30`; ambos entram em `canSubmit` e nas mensagens exibidas.
- `supabase/functions/ai-assistant/tools.ts` (`buildVacationTools` → `request_vacation`): mesma checagem de primeira parcela, mínimos 14/5, justificativa obrigatória abaixo de 30 dias e `sell_days` limitado a `max_dias_abono`.
- `supabase/functions/ai-assistant/index.ts`: regras dos 14/5 dias e da justificativa no bloco FÉRIAS.
- Sem mudança de schema.
