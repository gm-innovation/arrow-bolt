# Correções na busca de produtos EVA (Marina)

## O que está errado

Comparei a resposta da Marina com o catálogo real do EVA (consulta feita agora, termo "antena"):

| Produto | Código real | Moeda real | Preço venda real | Saldo |
|---|---|---|---|---|
| ANTENA GPA 017/S | PRD00031 | USD | 307,60 | 15 |
| ANTENA GPA 021S | PRD00029 | USD | 1.158,156 | 2 |
| ANTENA GPA-017 | PRD00020 | BRL | 792,73 | 0 |

Três problemas confirmados:

1. **O produto exato pedido não apareceu.** O usuário pediu "antena gpa-17" e existe `ANTENA GPA-017` (PRD00020) no EVA, mas ela não foi listada. O filtro compara os termos como texto literal: "gpa-17" não casa com "gpa-017" nem com "gpa 017/s" (diferença de hífen e do zero à esquerda). Sobraram apenas casamentos parciais por "antena".
2. **Moeda errada.** Os dois itens citados são em **USD**, e a Marina apresentou como "BRL". O dado de moeda vem correto da ferramenta, mas é ignorado na resposta.
3. **Preço sem formatação.** "BRL 1158.156" em vez de "US$ 1.158,16". O EVA devolve mais de duas casas decimais e o número é repassado cru.

Observação adicional: o item exato (PRD00020) está com saldo zero. Quando ele passar a aparecer, a resposta precisa deixar isso claro em vez de omitir o produto.

## O que será feito

### 1. Casamento tolerante de nome/código (`_shared/eva-products.ts`)
- Normalizar a busca e o texto do produto removendo hífens, barras, pontos e espaços extras, para que "gpa-17", "gpa 17", "gpa017" e "GPA-017" caiam no mesmo formato.
- Tolerar zeros à esquerda em tokens numéricos ("17" casa com "017").
- Manter a busca em degraus atual, mas priorizar por relevância: casamento exato de nome/código primeiro, depois prefixo, depois parcial. Assim `ANTENA GPA-017` vira a primeira opção de "gpa-17".
- Como o mesmo arquivo é usado pela tela de Estoque EVA, pelo CRM e pela Marina, a correção vale para todas as áreas.

### 2. Moeda e preço confiáveis (`ai-assistant`)
- A ferramenta passa a devolver, além dos números, um campo já formatado por linha (ex.: `US$ 1.158,16`, `R$ 792,73`) com arredondamento em 2 casas, além de um rótulo de saldo (`15 em estoque` / `sem estoque`).
- Reforçar nas regras da persona: citar sempre a moeda que veio da ferramenta e usar o valor formatado, nunca assumir BRL nem inventar código.

### 3. Itens sem saldo
- Na lista de candidatos, marcar explicitamente os itens com quantidade zero como "sem estoque" em vez de escondê-los, para o usuário decidir.

### 4. Validação
- Consultar a função de produtos com os termos "gpa-17", "gpa 017", "PRD00020" e confirmar que `ANTENA GPA-017` aparece em primeiro lugar.
- Repetir o pedido "adicione uma antena gpa-17" com a Marina e conferir código, moeda e preço contra o catálogo.

## Detalhes técnicos
- `supabase/functions/_shared/eva-products.ts`: nova normalização (`normKey`) sem separadores, tokens numéricos sem zeros à esquerda, e pontuação de relevância (exato > prefixo > todos os termos > parcial).
- `supabase/functions/ai-assistant/tools.ts`: `query_stock_products` e `add_opportunity_product` passam a expor `preco_venda_formatado`, `custo_formatado` e `saldo_texto`; candidatos de desambiguação incluem moeda e saldo.
- `supabase/functions/ai-assistant/index.ts`: ajuste das regras E1/E4 do prompt para exigir moeda e valor formatado exatamente como devolvidos.
- Sem mudança de banco de dados.
