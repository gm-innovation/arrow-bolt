# Corrigir a falsa ambiguidade de nomes da Marina

## O problema (confirmado no código e nos logs)

O log da função `ai-assistant` mostra a chamada `find_person` com `{"name":"hugo alexandre"}` retornando 3 candidatos. Isso acontece por causa da fórmula de pontuação em `supabase/functions/ai-assistant/people.ts`:

```text
score = max( média dos tokens , melhor_token * 0.9 )
```

- "HUGO ALEXANDRE SANTOS SILVA" → os dois tokens batem exatos → score 1,00
- "Alexandre Silva" → só "alexandre" bate → média 0,50, mas `melhor_token * 0.9` eleva para 0,90
- "ALEXANDRE STARCK DE OLIVEIRA" → mesma coisa, 0,90

Com 1,00 vs 0,90 a diferença é 0,10, abaixo do limite de 0,20 exigido por `isDominantMatch`, então a Marina pergunta "qual deles?" mesmo com o nome completo e exato na mão.

## O que muda

1. **Nome com 2+ palavras exige cobertura.** O atalho "melhor token isolado vale 0,90" passa a valer só quando o usuário digitou um único nome (ex.: "Gabril"). Com dois ou mais termos, quem casa só um deles cai para a faixa de ~0,5 e sai da lista de candidatos.
2. **Casamento de sequência vira certeza.** Quando todos os termos aparecem no nome completo, na ordem e sem furos (ex.: "hugo alexandre" dentro de "HUGO ALEXANDRE SANTOS SILVA"), o score vira 1,00 e o registro é tratado como correspondência única — sem pergunta de desambiguação.
3. **Corte mais firme na lista de parecidos.** O corte relativo ao melhor resultado sobe, e passa a existir um piso absoluto para nomes multi-token, para que sobrenomes coincidentes não gerem "pessoas parecidas".
4. **Dominância recalibrada.** `isDominantMatch` passa a aceitar também o caso "melhor resultado com casamento de sequência completo", além do critério de margem atual.

Depois do ajuste, "registre férias para o colaborador hugo alexandre no dia 03/01/27, 20 dias vendendo 10" deve executar direto, sem lista de candidatos.

## Detalhes técnicos

- `supabase/functions/ai-assistant/people.ts`: refatorar `nameScore` (cobertura de tokens + bônus de sequência), endurecer o filtro em `searchPeople` e ampliar `isDominantMatch`.
- Nenhuma alteração de banco de dados, RLS ou UI.
- Verificação: rodar os casos "hugo alexandre", "Hugo Alexndre" (com erro de digitação), "Alexandre" (aí sim a ambiguidade é legítima e deve listar) e "Gabril" contra a lógica ajustada, e redeploy da função.
