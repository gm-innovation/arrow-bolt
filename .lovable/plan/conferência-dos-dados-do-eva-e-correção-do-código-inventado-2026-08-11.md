# Conferência dos dados do EVA e correção do código inventado pela Marina

## O que os dados reais dizem

Consulta ao vivo à API do EVA para "kit overhaul" (1 resultado):

| Campo | Valor |
|---|---|
| Nome | KIT OVERHAUL STD22 |
| Código | PRD00089 |
| NCM | 8517.62.77 |
| Posição | D4 |
| Quantidade | 9 |
| Custo unitário | R$ 2.478,00 |
| Preço de venda | R$ 4.212,60 |
| Vendável | sim |

Conclusões:
- A tela da oportunidade está **correta**: PRD00089, R$ 4.212,60, 9 em estoque, D4.
- A primeira resposta da Marina (9 unidades, D4, R$ 4.212,60) está **correta**.
- A segunda resposta da Marina está **errada**: o código não é "KO-STD22", é **PRD00089**. Ela inventou o código.
- Observação de leitura: R$ 2.478,00 na planilha do EVA é o **custo**, não o preço de venda (venda = custo + 70% de margem = R$ 4.212,60).

## Por que a Marina inventou o código

A busca obrigatória ao estoque só é injetada quando a mensagem atual contém palavras de produto/estoque. "qual o código dele?" não contém nenhuma, então nenhum resultado do EVA entrou no contexto daquele turno — e o histórico enviado ao modelo guarda apenas o texto das respostas, não os dados da ferramenta. Sem os dados, o modelo completou com um código plausível.

## Correções

1. **Persistir o resultado do estoque na conversa** (`supabase/functions/ai-assistant/`): ao executar `query_stock_products`, gravar os itens retornados como metadados da mensagem da conversa e reinjetá-los como contexto no turno seguinte, para perguntas de acompanhamento ("qual o código", "e o preço", "onde fica").

2. **Ampliar o gatilho de consulta obrigatória** para pronomes/atributos de acompanhamento (código, preço, NCM, posição, quantidade, "dele", "desse item") quando o turno anterior já tratou de produto — reaproveitando o termo de busca anterior.

3. **Regra anti-invenção no prompt do sistema**: código, NCM, preço, posição e quantidade só podem ser citados se vierem literalmente do resultado da ferramenta; caso contrário a Marina deve dizer que precisa consultar de novo. Proibido derivar código do nome do produto.

4. **Distinguir custo e preço de venda** na resposta, deixando explícito qual valor é qual, para evitar a confusão vista na planilha.

## Detalhes técnicos

- Alterações concentradas em `supabase/functions/ai-assistant/index.ts` (gatilho, reinjeção do último resultado, prompt) e, se necessário, em `tools.ts` para retornar um resumo enxuto persistível.
- Persistência do snapshot na tabela de mensagens da IA já existente (campo de metadados), limitada aos últimos itens consultados para não inflar o contexto.
- Nenhuma mudança de schema nem na tela da oportunidade (já está correta).
