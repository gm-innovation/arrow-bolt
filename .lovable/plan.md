# Marina: escolher o produto certo quando há variantes parecidas

## O que aconteceu

Você pediu "adicione a antena gpa-17". O catálogo do EVA tem dois itens parecidos:

- `ANTENA GPA-017` — código PRD00020 (saldo 0)
- `ANTENA GPA 017/S` — código PRD00031 (saldo 15)

A busca devolve os dois corretamente, com o exato em primeiro lugar. O erro está na etapa seguinte:

1. Ao adicionar um item, a Marina só considera "produto exato" quando o texto digitado é **idêntico** ao nome ou ao código. "gpa-17" não é idêntico a "ANTENA GPA-017", então ela cai no modo "tem mais de um candidato".
2. Nesse modo ela recebe a lista dos dois candidatos, mas nada a obriga a mostrar **todos**. Ela mostrou só um (o `/S`) e pediu confirmação.
3. Quando você corrigiu ("não, gpa-017"), ela não reconsultou nem releu a lista que já tinha, e afirmou que o produto sem "/S" não existe — o que é falso.

## Correção

1. **Casamento tolerante na escolha do produto**: reaproveitar a mesma normalização já usada na busca (ignora hífen, barra, espaço e zeros à esquerda) para decidir se há um candidato exato. Com isso "gpa-17", "gpa 017" e "gpa017" resolvem direto para `ANTENA GPA-017` (PRD00020), sem perguntar nada.
2. **Desempate por código quando o usuário informa variante**: se o termo casar exatamente com um nome/código pela chave normalizada, esse item ganha, mesmo que outro tenha mais saldo.
3. **Quando a pergunta for necessária, listar todos os candidatos**: regra de persona obrigando a apresentar a lista numerada completa devolvida pela ferramenta (nome, código, moeda, preço formatado e saldo), nunca um único item; e proibindo afirmar que um produto "não existe" quando ele aparece na lista de candidatos ou na consulta ao estoque do turno.
4. **Correção do usuário reabre a escolha**: ao receber uma correção sobre qual variante é ("não, é a X", "sem o /S"), a Marina refaz a resolução do produto com o novo termo em vez de responder de memória.
5. **Saldo sempre informado**: ao citar, confirmar ou adicionar um produto, a Marina informa a quantidade disponível exatamente como vem do EVA (ex.: "15 em estoque", "sem estoque"). O retorno da ferramenta passa a incluir o saldo do produto.
6. **Saldo é limite rígido** (validado no servidor, não só na conversa):
   - Saldo zero: **não adiciona**. Ela avisa que não temos o item em estoque e oferece buscar alternativa.
   - Saldo menor que o pedido: **não adiciona a quantidade pedida**. Ela avisa quanto há e pergunta se quer adicionar a quantidade máxima disponível; ao confirmar, adiciona exatamente o saldo.
   - Nunca é possível incluir quantidade acima do saldo, mesmo se o usuário insistir.

## Detalhes técnicos

- `supabase/functions/_shared/eva-products.ts`: exportar os helpers de normalização já existentes (`matchKey`, `compactKey`) sem alterar `filterEvaProducts` — a busca que hoje funciona fica intacta.
- `supabase/functions/ai-assistant/tools.ts` (`add_opportunity_product`): trocar a comparação `toLowerCase() === term` por comparação via chave normalizada, com precedência nome exato > código exato; manter a desambiguação para os casos genuinamente ambíguos (ex.: "antena") e manter os campos formatados nos candidatos; incluir `quantidade_atual`/`saldo_texto`; recusar a gravação (`error` + `saldo_disponivel`) quando o saldo for zero e devolver `requires_stock_confirmation` com `quantidade_maxima` quando o pedido exceder o saldo — a gravação só ocorre com a quantidade limitada ao saldo. A mesma checagem entra em `update_opportunity_product` para aumento de quantidade.
- `supabase/functions/ai-assistant/index.ts`: acrescentar às regras E (estoque) a obrigação de listar todos os candidatos com saldo, informar o saldo ao confirmar/adicionar item, o roteiro de saldo parcial e saldo zero, e a proibição de negar existência de item presente na consulta do turno; e regra de re-resolução após correção do usuário.

## Cuidado com regressão

Antes de encerrar, rodar uma checagem determinística dos casos que já funcionavam e dos novos, comparando o item escolhido:

```text
"gpa-17"          -> ANTENA GPA-017 (PRD00020)   escolha direta
"gpa 017"         -> ANTENA GPA-017 (PRD00020)   escolha direta
"gpa017"          -> ANTENA GPA-017 (PRD00020)   escolha direta
"gpa 017/s"       -> ANTENA GPA 017/S (PRD00031) escolha direta
"PRD00031"        -> ANTENA GPA 017/S (PRD00031) escolha direta
"antena"          -> pergunta com lista numerada completa
"kit overhaul"    -> segue como hoje (sem mudança)
```

Nada de alteração em busca de oportunidades, remoção de itens, recálculo de valor ou realtime — esses fluxos ficam como estão.
