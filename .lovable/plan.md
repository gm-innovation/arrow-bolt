# Marina precisa achar a oportunidade da Camorim

## O que os dados dizem

A oportunidade existe e é única no banco:

| Campo | Valor |
|---|---|
| Título | RFQ pelo site — Cahuã |
| Cliente | Camorim |
| Responsável / criador | João Silva |
| Estágio | qualified |

A ferramenta `query_crm_opportunities` já busca por título, descrição, notas, nome do cliente e nome do responsável, e está registrada para o perfil comercial. Uma busca por "camorim" ou por "rfq pelo site" casaria com esse registro. Ou seja: a busca em si funcionaria — o que não está comprovado é se a Marina chegou a executar a ferramenta. As mensagens gravadas não guardam evidência de chamada de ferramenta, então o primeiro passo é provar isso, não presumir.

## Passo 1 — Provar se a ferramenta foi chamada

Chamar a função `ai-assistant` com a mesma frase ("pode incluir uma na oportunidade da Camorim solicitada pelo Cahuã?") e ler os logs para ver se `query_crm_opportunities` aparece e o que ela devolveu. Adicionar um log explícito de cada chamada de ferramenta (nome, argumentos, quantidade de linhas retornadas) para que esse tipo de dúvida não volte a exigir adivinhação.

## Passo 2 — Não depender da boa vontade do modelo

Mesmo padrão já usado com o estoque EVA: quando a mensagem do usuário mencionar oportunidade/RFQ/pipeline ou referenciar um registro por cliente/pessoa ("da Camorim", "do Cahuã", "tente novamente", "rfq pelo site"), o servidor executa a busca antes da resposta e injeta os resultados reais no contexto. A Marina passa a responder sobre dados que já estão na mesa, sem opção de dizer "não encontrei".

Detalhes do comportamento:
- Extrair os termos úteis da frase (nomes próprios e palavras de título), descartando conectores como "solicitada pelo".
- Buscar cada termo separadamente e unir os resultados, em vez de mandar a frase inteira para o `ilike`.
- Tolerar erro de digitação simples nos nomes ("Camorin" por "Camorim"), reduzindo o termo ao radical quando a busca exata não retorna nada.

## Passo 3 — Memória de contexto entre turnos

Gravar a última busca de oportunidades no contexto da conversa (mesmo mecanismo do `last_stock_lookup`) e reinjetá-la nos turnos seguintes. Assim "tente novamente" e "rfq pelo site" continuam a conversa em cima do candidato já encontrado, em vez de recomeçar do zero.

## Passo 4 — Fechar o fluxo pedido

Com a oportunidade identificada, a Marina confirma em uma frase ("Incluo 1 × KIT OVERHAUL STD22 a R$ 4.212,60 na oportunidade RFQ pelo site — Cahuã / Camorim?") e grava o item com a ferramenta de itens já existente após o "pode".

## Passo 5 — Validar

Testar em sequência: "temos kit overhaul?", "pode incluir uma na oportunidade da Camorim solicitada pelo Cahuã?", "pode" — e conferir nos logs que a busca rodou e que o item apareceu na aba Itens da oportunidade.

## Detalhes técnicos

- `supabase/functions/ai-assistant/index.ts`: novo bloco de interceptação de oportunidades espelhando o de estoque (detecção por termos, execução da busca, injeção do resultado como contexto), persistência de `last_opportunity_lookup` em `ai_conversations.context` e log estruturado das chamadas de ferramenta.
- `supabase/functions/ai-assistant/tools.ts`: `query_crm_opportunities` passa a aceitar múltiplos termos, normalizar acentos e cair para busca por radical quando a busca exata não retorna nada.
- Sem alteração de schema, de RLS ou de telas.
