# Marina anuncia a remoção mas não executa

## O que os registros mostram

- No pedido "remova 1", a Marina chamou apenas `list_opportunity_products` (2 itens) e depois respondeu texto: "vou remover 1 unidade... Aguarde um momento enquanto atualizo".
- O log de ações da Marina (últimas 8 escritas) só tem `add_opportunity_product` bem-sucedidos. Não existe nenhum registro de remoção ou ajuste — com erro ou sucesso.

Conclusão: a remoção nunca foi tentada. Ela encerrou o turno com um anúncio, em vez de chamar a ferramenta. Não é problema de permissão nem de banco.

Há também uma ambiguidade real: "remova 1" pode significar "reduza 1 unidade" (ajuste de quantidade) ou "remova o item 1 da lista". A Marina interpretou como redução de unidade, mas a ferramenta de redução é `update_opportunity_product`, e ela não a acionou.

## O que fazer

1. **Proibir o anúncio-sem-ação (regra dura na persona)**
   Reforçar no prompt: quando a ação já é possível, é proibido responder "vou fazer / aguarde um momento / já atualizo" sem executar a ferramenta no mesmo turno. Só duas saídas são válidas: executar agora, ou fazer uma pergunta objetiva.

2. **Rede de segurança no laço de execução**
   No laço da Edge Function, quando a resposta final for texto sem chamada de ferramenta e contiver marcadores de ação futura ("vou remover/adicionar/atualizar", "aguarde", "já atualizo") logo depois de um `list_opportunity_products`, injetar uma mensagem de sistema exigindo a execução e repetir a rodada uma única vez. Se ainda assim não executar, responder pedindo confirmação em vez de prometer.

3. **Interpretar "remova N" corretamente**
   Regra explícita para itens de oportunidade: "remova 1 (unidade)" com quantidade maior que 1 → `update_opportunity_product` reduzindo a quantidade; "remova o item" ou quantidade chegando a zero → `remove_opportunity_product`. Se o texto for ambíguo e existir mais de um item, perguntar em uma frase curta com a lista numerada.

4. **Fechar o turno com o resultado real**
   Depois da escrita, a resposta deve citar o item afetado e o novo valor estimado devolvido pela ferramenta (a sincronização de valor já é feita pelo gatilho no banco).

## Detalhes técnicos

- `supabase/functions/ai-assistant/index.ts`: regras de persona (bloco A/N/P) + rede de segurança no laço de `tool_calls` (retry único com mensagem de sistema).
- `supabase/functions/ai-assistant/tools.ts`: descrições de `remove_opportunity_product` e `update_opportunity_product` deixando claro o critério unidade vs item; sem mudança de schema.
- Sem migração de banco.

## Validação

- "remova 1" com item de quantidade 2 → quantidade cai para 1, valor da oportunidade recalculado, registro `update` no log de ações.
- "remova o KIT OVERHAUL" → item excluído, registro `delete` no log.
- Conferir nos logs da função que a rodada seguinte à listagem contém a chamada de escrita.
