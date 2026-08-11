# Produtos do estoque LOGVI no Comercial e na Marina

## Conexão testada e funcionando

O escopo foi liberado. A chamada agora retorna `200` com **260 produtos** do estoque "Estoque - p/ Serviço & Comercial", cada um com:

```
produto_id, codigo (PRD00114), ncm, nome, classificacao, posicao (C2),
vendavel, quantidade_atual, custo_unitario_atual, moeda (BRL/USD),
margem_percentual, data_definicao, preco_venda
```

Como o token foi colado no chat, ele deve ser considerado exposto — recomendo pedir rotação à LOGVI depois que a integração estiver rodando. Ele será guardado apenas como segredo do backend, nunca no frontend.

## O que vai ser feito

1. **Segredo do backend** `LOGVI_API_TOKEN`.
2. **Nova Edge Function `logvi-products`**: consulta o endpoint no servidor com os três cabeçalhos, normaliza a resposta e devolve a lista (código, nome, NCM, posição, vendável, quantidade, custo, moeda, margem, preço de venda). Valida a sessão em código e repassa erros do provedor com status e mensagem reais.
3. **Comercial – Produtos**: busca por nome/código sobre o catálogo LOGVI, com colunas de quantidade, custo, moeda, margem, preço de venda e posição no estoque; badge para itens não vendáveis e para estoque zerado. Botão **"Sincronizar do LOGVI"** que cria/atualiza os itens em `stock_products` por `external_product_id`, preservando ajustes locais de preço quando o item foi editado manualmente.
4. **Nova Venda**: passa a enxergar o estoque real (a base local alimentada pela sincronização), já com preço de venda e disponibilidade vindos do LOGVI.
5. **Marina**: nova ferramenta de consulta de produtos de estoque, liberada para Comercial, Marketing, Coordenação, Diretoria, Super Admin e Suprimentos — permite perguntas como "temos ACTIVE COUPLER em estoque?" e receber código, quantidade, preço e posição.

## Detalhes técnicos

- `supabase/functions/logvi-products/index.ts`: `GET` com `Authorization: Bearer ${Deno.env.get("LOGVI_API_TOKEN")}` + `Content-Type`/`Accept: application/json`; parâmetros opcionais (`search`, `only_sellable`) validados com Zod; filtro aplicado no servidor sobre `data`; parser tolerante (aceita `data` ou array na raiz). Registro em `supabase/config.toml` com `verify_jwt = true`.
- `src/hooks/useLogviProducts.ts`: `supabase.functions.invoke` com cache TanStack Query e leitura do erro real via `FunctionsHttpError`.
- `src/hooks/useStockProducts.ts`: `upsertFromLogvi`, análogo ao `upsertFromEva`, gravando `sell_price` (`preco_venda`), `unit_cost`, `current_quantity`, `external_product_code` e `is_active` (a partir de `vendavel`), em upsert por `company_id,external_product_id`.
- Migração pequena em `stock_products`: colunas opcionais `ncm`, `stock_position`, `currency`, `margin_percentage` (nullable, com GRANT/RLS já existentes da tabela preservados) para não perder informação do LOGVI.
- `src/pages/commercial/Products.tsx`: painel de busca LOGVI + ação de sincronizar, com resumo de criados/atualizados.
- `supabase/functions/ai-assistant/tools.ts`: novo módulo `stock_products` no catálogo de ferramentas, com leitura filtrada por `company_id`, liberado nos papéis citados.
