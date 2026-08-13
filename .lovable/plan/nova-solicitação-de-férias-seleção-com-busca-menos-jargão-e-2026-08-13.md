# Nova Solicitação de Férias: seleção com busca, menos jargão e validação de datas

Ajustes no diálogo "Nova Solicitação de Férias" em `/hr/vacations`.

## 1. Seleção de colaborador com busca e rolagem normal

Hoje a lista usa um Select que rola por setas (as pequenas flechas no topo/base), difícil de usar com 30+ colaboradores.
Passa a ser um campo de busca (Combobox): digita parte do nome e a lista filtra, com rolagem por scroll do mouse/trackpad e altura limitada. O cargo continua aparecendo como texto secundário.

## 2. Sai o "Período Aquisitivo"

O campo é jargão de DP e não faz sentido para o colaborador comum, então sai do formulário.
O vínculo com o período aquisitivo continua acontecendo, mas automaticamente: o sistema escolhe o período mais antigo ainda com saldo do colaborador (mesma regra de prioridade usada hoje na lista). Se não houver período com saldo, a solicitação é gravada sem vínculo, como já é possível hoje.
O RH continua vendo e ajustando períodos na aba "Períodos Aquisitivos".

## 3. Datas coerentes

- A data fim não pode ser anterior à data de início: o campo Fim passa a ter mínimo igual ao Início, e se ficar inválido aparece a mensagem "A data fim deve ser igual ou posterior à data de início" e o botão de salvar fica desabilitado.
- O total de dias só é calculado quando o intervalo é válido.

## 4. Mínimo de 14 dias, com exceção para férias divididas

- Padrão: menos de 14 dias corridos bloqueia o envio, com a mensagem "Férias devem ter no mínimo 14 dias corridos, exceto quando divididas em parcelas".
- Uma opção "Dividir férias em parcelas" libera períodos menores, exigindo no mínimo 5 dias corridos (regra da CLT para as parcelas complementares).
- Se a política da empresa estiver marcada como "não permite parcelamento", o colaborador **ainda pode** solicitar: aparece apenas um aviso em âmbar de que a divisão contraria a política e depende de aprovação, sem travar o envio. O conflito correspondente continua sendo registrado pelo motor de regras para o RH avaliar.

## Detalhes técnicos

- `src/pages/hr/Vacations.tsx` (`NewRequestDialog`): trocar o `Select` de colaborador por `Popover` + `Command` (padrão Combobox do shadcn já usado no projeto, com `CommandInput`/`CommandList` e `max-h` + `overflow-y-auto`); remover o `Select` de período e o estado `periodId`.
- Escolha automática do período: derivar de `useVacationPeriods(employeeId)` o primeiro período com `entitled_days - used_days - sold_days > 0` ordenado por `period_start`, passando o `id` em `period_id` na mutação.
- Validação local com mensagens inline (sem alterar schema nem hooks de dados): `daysBetween` só quando `endDate >= startDate`; regra de mínimo dependente do novo estado `isSplit`; `min` no input de Fim.
- A regra `permite_parcelamento` de `useVacationRules` é usada apenas para exibir o aviso, nunca para bloquear.
- Nenhuma mudança de banco, política ou Edge Function.
