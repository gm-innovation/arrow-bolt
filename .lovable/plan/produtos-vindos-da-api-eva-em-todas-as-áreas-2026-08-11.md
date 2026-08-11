# Produtos vindos da API EVA em todas as áreas

Hoje só a tela **Catálogo de Estoque** consulta a API do EVA. As outras áreas leem a tabela local `stock_products`, que só é preenchida pelo botão "Sincronizar do EVA" — é por isso que a aba **Itens** da oportunidade mostra "Nenhum produto encontrado" e a Marina responde que não encontrou "kit de overhaul", mesmo com o produto existindo no EVA (PRD00089, KIT OVERHAUL STD22, marcado como "Não sincronizado").

## O que muda

1. **Aba Itens da oportunidade** — a busca passa a consultar o catálogo do EVA ao vivo (nome, código, NCM), com quantidade em estoque e preço de venda direto da API. Ao adicionar um item, o produto é registrado/atualizado automaticamente na base local (só aquele item), para que o vínculo do item da oportunidade continue apontando para um produto real, com código, custo, preço de lista e margem gravados no momento da negociação.

2. **Nova Venda (Comercial)** — mesma busca no catálogo do EVA, exibindo disponibilidade real. O produto escolhido também é materializado localmente na hora, mantendo o desconto de estoque e o histórico da venda funcionando.

3. **Marina (assistente)** — a consulta de produtos passa a bater na API do EVA primeiro, e só usa a base local como reserva se a API falhar. Assim perguntas como "temos kit de overhaul no estoque?" retornam código, quantidade, preço de venda, moeda, margem e posição sem depender de sincronização prévia.

4. **Conversão de lead do site** — o casamento automático dos itens pedidos pelo cliente passa a ser feito contra o catálogo do EVA (código e nome), não apenas contra o que já está sincronizado.

5. **Catálogo de Estoque** — mantém o botão "Sincronizar do EVA" como sincronização em massa (útil para relatórios e uso offline), mas ele deixa de ser pré-requisito para as demais telas.

6. **Renomeação técnica** — a função de backend `logvi-products` passa a se chamar `eva-products`, encerrando as últimas referências ao nome antigo.

## Detalhes técnicos

- Nova Edge Function `supabase/functions/eva-products/index.ts` (mesmo conteúdo da atual `logvi-products`, token via `Deno.env.get`, Zod nos parâmetros, `verify_jwt = true` em `supabase/config.toml`); a antiga é removida e `src/hooks/useEvaStockProducts.ts` passa a invocá-la.
- `src/hooks/useEvaCatalog.ts` (novo): expõe a lista do EVA já normalizada + `ensureLocalProduct(evaProduct)`, que faz upsert em `stock_products` por `company_id,external_product_id` e devolve o `id` local. Reaproveita a lógica de upsert já existente em `useStockProducts` para não duplicar regras (preserva `sell_price` ajustado manualmente).
- `OpportunityProductsTab.tsx`: Combobox alimentado por `useEvaCatalog`; no `addItem`, chama `ensureLocalProduct` antes de gravar `stock_product_id`, `item_name`, `item_code`, `list_unit_value`.
- `CreateSaleDialog.tsx`: troca `useStockProducts().products` por `useEvaCatalog`, filtrando `vendavel && quantidade_atual > 0`; `ensureLocalProduct` antes de montar os itens da venda, preservando `decrement_stock_quantity`.
- `useOpportunityProducts.linkLeadItemsToOpportunity`: matching sobre a lista do EVA (normalização sem acento, por código e por nome), materializando os itens casados.
- `supabase/functions/ai-assistant/tools.ts`: `query_stock_products` deixa de ser `basicQueryTool` e passa a handler próprio que chama a Edge Function do EVA com filtro por termo, com fallback para `stock_products`; papéis liberados permanecem os mesmos.
- Sem migração de banco — o esquema atual já suporta tudo.
