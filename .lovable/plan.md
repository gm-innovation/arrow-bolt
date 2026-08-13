# Regra CLT dos 14 dias no pedido de férias

Hoje o modal exige apenas 5 dias corridos por solicitação. Falta a regra da CLT: quando as férias são divididas, **uma das parcelas precisa ter no mínimo 14 dias corridos** e as demais no mínimo 5 dias.

## Como vai funcionar

Ao informar o período, o sistema olha o saldo do período aquisitivo e as solicitações já existentes do colaborador naquele mesmo período aquisitivo (pendentes ou aprovadas):

- Pedido com **14 dias ou mais**: válido, nenhum aviso.
- Pedido **entre 5 e 13 dias**, quando já existe outra parcela de 14+ dias no mesmo período aquisitivo: válido — a regra já está cumprida.
- Pedido **entre 5 e 13 dias** sem parcela de 14+ dias e com saldo restante suficiente (14 ou mais): permitido, com aviso informando que a próxima parcela precisará ter no mínimo 14 dias corridos.
- Pedido **entre 5 e 13 dias** sem parcela de 14+ dias e sem saldo restante para formar 14 dias: bloqueado, explicando que ao menos uma parcela precisa ter 14 dias corridos.
- Pedido com **menos de 5 dias**: bloqueado (regra atual mantida).

Quando o colaborador escolher **vender os dias restantes** e isso deixar o saldo abaixo de 14 dias sem nenhuma parcela longa, o aviso vira bloqueio — o abono não pode inviabilizar a parcela mínima legal.

O texto de resumo no modal passa a mostrar a situação da regra em uma linha, por exemplo: "7 dias de gozo · restam 23 dias · a próxima parcela precisa ter no mínimo 14 dias".

## Paridade com a Marina

A mesma validação entra em `request_vacation`: antes de gravar, a ferramenta calcula parcelas existentes e saldo, devolve erro explicativo nos casos bloqueados e um campo de aviso nos casos permitidos, para a Marina avisar o usuário na resposta. As instruções da Marina no prompt ganham a regra dos 14 dias.

## Detalhes técnicos

- `src/pages/hr/Vacations.tsx` (`NewRequestDialog`): novo cálculo derivado a partir de `useVacationRequests(employeeId)` filtrado por `period_id === autoPeriod.id` e status em `draft`/`pending_manager`/`pending_hr`/`approved`/`em_gozo`; substitui `belowMinimum` por um objeto `minimumCheck` com `{ blocked, warning, message }` usado em `canSubmit` e na mensagem exibida.
- `supabase/functions/ai-assistant/tools.ts` (`buildVacationTools` → `request_vacation`): consulta as solicitações existentes do período aquisitivo e aplica as mesmas faixas antes do insert.
- `supabase/functions/ai-assistant/index.ts`: acrescenta a regra dos 14 dias no bloco FÉRIAS do prompt.
- Sem mudança de schema: `hr_vacation_rules` não recebe coluna nova (o mínimo legal de 14/5 dias não é configurável por empresa).
