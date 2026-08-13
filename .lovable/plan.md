# Marina mais inteligente ao excluir/cancelar férias

## Problema

Ao pedir "exclua as férias do Hugo Alexandre", a Marina listou duas opções — sendo que uma delas já estava **cancelada**. Perguntar entre uma programação ativa e outra cancelada não é ambiguidade real: só existe uma férias para excluir.

## Comportamento novo

1. **Ignorar o que já está encerrado.** Programações com status cancelada, rejeitada ou concluída nunca entram na lista de escolhas. Só contam as ativas (rascunho, aguardando gestor/diretoria/RH, aprovada, em gozo).
2. **Resolver sozinha quando há só uma.** Se sobrar exatamente uma programação ativa, a Marina já mostra o resumo dela e pergunta apenas "confirmar o cancelamento?" — sem etapa de "qual delas?".
3. **Perguntar só quando há empate real.** Com duas ou mais ativas, ela lista as ativas com período, dias e status, e diz explicitamente que existem outras já canceladas (sem oferecê-las).
4. **"Excluir" = cancelar.** A Marina passa a aceitar "excluir/apagar/remover férias" como cancelamento e informa que o registro fica no histórico como cancelado, em vez de sumir.
5. **Aceitar o nome do colaborador direto.** Hoje a exclusão exige que ela já tenha o identificador da solicitação; passa a aceitar o nome (e opcionalmente mês/ano ou data de início) e resolver internamente, usando a mesma busca de pessoas já usada no agendamento.
6. **Nada de encerrado por engano.** Se a única correspondência já estiver cancelada, ela responde que não há férias ativas para excluir naquele período — sem tentar cancelar de novo.

## Detalhes técnicos

- `supabase/functions/ai-assistant/tools.ts` — `cancel_vacation_request`:
  - novos parâmetros opcionais `employee_name`, `month`/`year` ou `start_date`, além do `request_id` atual;
  - resolução de colaborador via `people.ts` (mesma lógica dominante de `request_vacation`);
  - busca das solicitações do colaborador filtrando status ativos (`draft`, `pending_manager`, `pending_director`, `pending_hr`, `approved`, `em_gozo`);
  - 0 ativas → mensagem clara; 1 ativa → segue direto para o `confirm_token` com resumo; 2+ → retorno `needs_disambiguation` com apenas as ativas e a contagem de encerradas.
- `supabase/functions/ai-assistant/index.ts` — instruções de férias: sinônimos de exclusão mapeados para cancelamento, proibição de oferecer solicitações canceladas/rejeitadas como opção e regra de resolver direto quando há uma única ativa.
- Nenhuma mudança de banco de dados nem de interface.
