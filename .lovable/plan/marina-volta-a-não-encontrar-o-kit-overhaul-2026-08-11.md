# Marina volta a "não encontrar" o kit overhaul

## Diagnóstico confirmado

Você digitou "oi, Marina, temos kit overhaul no estoque?". Antes de consultar o EVA, o sistema limpa a frase removendo verbos e ruídos ("temos", "no estoque", "Marina", "?"). Sobrou `"oi kit overhaul"` — foi exatamente esse termo que apareceu no log da consulta, com `count: 0`.

Duas causas se somam:

1. A limpeza remove "Marina", mas não remove saudações ("oi", "olá", "bom dia", "e aí"). Então "oi" ficou colado no termo de busca.
2. O filtro do catálogo EVA exige que **todos** os termos apareçam no produto. Nenhum item contém "oi", então "KIT OVERHAUL STD22" foi descartado mesmo tendo "kit" e "overhaul".

Sobre a frase dela: ela realmente entendeu o pedido — inclusive repetiu "kit overhaul" corretamente. O que falhou foi a consulta feita nos bastidores, que voltou vazia; ela então relatou ausência com base num resultado errado. Nas vezes em que funcionou, a pergunta não começava com saudação, por isso o termo saía limpo. Ou seja: não é a compreensão dela, é o termo de busca contaminado por uma palavra que zera o filtro.


## Correção

1. **Limpeza do termo de busca**
   - Remover saudações e cortesias antes de consultar: oi, olá, ola, opa, bom dia, boa tarde, boa noite, e aí, tudo bem, obrigado/obrigada, valeu.
   - Manter a limpeza atual de pronomes e verbos.

2. **Busca tolerante no catálogo EVA**
   - Continuar exigindo todos os termos na primeira passada.
   - Se der zero, refazer o filtro considerando apenas os termos "significativos" (com 3+ caracteres) e, se ainda der zero, aceitar itens que casem com a maioria dos termos, ordenando por quantidade de termos casados.
   - Assim, um termo espúrio deixa de anular a busca inteira.

3. **Não afirmar ausência sem esgotar as tentativas**
   - Só permitir a resposta "não encontrei" quando a busca relaxada também retornar vazio.
   - Quando a busca relaxada resolver, a Marina responde com o item encontrado normalmente, sem pedir "um termo mais curto".

4. **Validação**
   - Testar "oi, Marina, temos kit overhaul no estoque?" e conferir nos logs que o termo consultado ficou "kit overhaul" e o retorno traz KIT OVERHAUL STD22 (posição D4, código PRD00089).
   - Testar em seguida "qual o código dele?" e conferir que o código vem do retorno real.

## Detalhes técnicos

- `supabase/functions/ai-assistant/index.ts`: ampliar a lista de remoção em `cleanProductSearch` com saudações/cortesias.
- `supabase/functions/_shared/eva-products.ts`: em `fetchEvaProducts`, transformar o filtro atual (`terms.every`) em busca em degraus — todos os termos, depois só termos significativos, depois melhor casamento parcial com ordenação por relevância.
- Redeploy da função `ai-assistant` (a função compartilha o leitor do EVA) e da `eva-products`.
