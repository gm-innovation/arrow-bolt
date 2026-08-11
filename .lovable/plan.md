# Remoção determinística de itens pela Marina

## Diagnóstico confirmado

- A oportunidade tem **dois registros separados** de `KIT OVERHAUL STD22`, cada um com quantidade 1.
- Na tentativa mais recente, a Marina chamou `update_opportunity_product` com o ID `6d953683-...`, mas esse ID não existe em `crm_opportunity_products`; os IDs reais são `17046911-...` e `2348455d-...`.
- O histórico persistido guarda apenas mensagens de usuário/assistente, não os resultados estruturados das ferramentas. Assim, em um turno seguinte a Marina pode lembrar que havia dois kits, mas não possui uma referência confiável aos IDs retornados antes.
- A rede de segurança atual apenas força uma nova chamada da ferramenta; ela não valida nem corrige o `item_id`, portanto repetiu a ação com um ID inválido.

## Correção

1. **Resolver a intenção no servidor antes da escrita**
   - Para pedidos de acompanhamento como “remova 1 dos kits”, relistar os itens da oportunidade atual no mesmo turno.
   - Nunca aceitar um `item_id` lembrado ou inventado em outro turno como fonte de verdade.

2. **Aceitar referência humana na atualização**
   - Estender `update_opportunity_product` para receber também `opportunity_id` + `product_search`.
   - O handler localizará os itens atuais no banco, sempre limitados à oportunidade e à empresa.
   - Se houver duplicatas idênticas e o usuário pedir remover uma delas, selecionar deterministicamente um registro real e excluir esse registro — o resultado final é exatamente um kit restante.

3. **Validar IDs e impedir falso sucesso**
   - Quando `item_id` for informado, conferir que ele pertence à oportunidade indicada antes de atualizar/excluir.
   - Tratar atualização/exclusão sem linha retornada como erro real, sem marcar a ação como executada.
   - A rede de segurança só considerará escrita concluída quando a ferramenta retornar `ok: true`.

4. **Responder com o estado confirmado**
   - Após remover, reler os itens e o valor estimado.
   - Informar somente o resultado efetivo: item removido, quantidade restante e novo valor.
   - Em falha, fazer uma nova consulta automática; não devolver ao usuário a tarefa de identificar IDs internos.

## Validação

- Estado inicial: dois registros idênticos, quantidade 1 cada.
- Pedido: “remova 1 dos kits”.
- Resultado esperado: um registro removido, um kit restante, valor estimado de R$ 4.212,60 e ação `remove_opportunity_product` registrada com sucesso.
- Repetir com “remova o outro kit”: nenhum item restante e valor estimado zerado.
- Confirmar nos logs que todo ID escrito foi obtido por consulta no mesmo turno e que nenhuma ferramenta com erro é tratada como execução concluída.

## Arquivos

- `supabase/functions/ai-assistant/index.ts`: resolução no mesmo turno, critério de sucesso e recuperação automática.
- `supabase/functions/ai-assistant/tools.ts`: busca por oportunidade/produto, validação de pertencimento e retorno pós-escrita.
- Sem migração de banco.
