# Produtos do estoque LOGVI no Comercial e na Marina

## Bloqueio verificado agora

Testei o endpoint com o token que você passou:

```
GET https://api.eva-googlemarine.com/departamentos/comercial/produtos-comercial
-> {"ok":false,"erro":"Integração sem permissão para consultar produtos",
    "code":"missing_scope","required_scope":"estoque.produtos.read"}
```

O token existe e autentica, mas a integração não tem o escopo `estoque.produtos.read`. Precisa pedir à LOGVI a liberação desse escopo (ou um token com ele). A implementação abaixo já fica pronta e passa a funcionar no momento em que o escopo for liberado — sem escopo, a sincronização apenas registra o motivo e não quebra a tela.

Como o token foi colado no chat, ele deve ser tratado como exposto: recomendo pedir rotação depois que a integração estiver funcionando. Ele será guardado apenas como segredo do backend.

## O que vai ser feito

1. **Segredo do backend** `LOGVI_API_TOKEN` (nada de chave no frontend).
2. **Nova Edge Function `logvi-products`** que consulta o endpoint no servidor com os cabeçalhos exigidos e devolve a lista normalizada (código, nome, unidade, quantidade disponível, custo, preço de venda quando houver). Suporta busca por termo e paginação, se a resposta trouxer paginação.
3. **Comercial – Produtos**: a tela ganha busca no catálogo LOGVI e um botão "Sincronizar do LOGVI", que atualiza/cria os itens em `stock_products` (mesmo caminho já usado pelo Eva, por `external_product_code`/`external_product_id`), sem apagar preços de venda definidos manualmente.
4. **Nova Venda**: a busca de produtos continua na base local, agora alimentada pela sincronização, então o comercial passa a ver o estoque real.
5. **Marina**: novo módulo/ferramenta de consulta de produtos de estoque (`stock_products`) liberado para `commercial`, `marketing`, `coordinator`, `director`/`manager`, `super_admin` e suprimentos, permitindo perguntas como "temos kit de overhaul em estoque?" com código, quantidade e preço.

## Detalhes técnicos

- `supabase/functions/logvi-products/index.ts`: `GET` com `Authorization: Bearer ${Deno.env.get("LOGVI_API_TOKEN")}`, `Content-Type` e `Accept: application/json`; valida JWT em código, valida parâmetros com Zod, repassa status e corpo do provedor em caso de erro (incluindo `missing_scope`, que é devolvido como mensagem clara na UI). Registro em `supabase/config.toml` com `verify_jwt = true`.
- Parser tolerante ao formato de resposta (aceita `data`, `produtos` ou array na raiz; nomes de campos variantes de código/quantidade/custo), no mesmo espírito do parser de retornos já existente.
- `src/hooks/useLogviProducts.ts`: consulta via `supabase.functions.invoke`, com cache TanStack Query.
- `src/hooks/useStockProducts.ts`: nova função `upsertFromLogvi`, análoga a `upsertFromEva`, preservando `sell_price` e `is_active` locais.
- `src/pages/commercial/Products.tsx`: aba/painel de busca LOGVI + ação de sincronizar; feedback de quantos itens foram criados/atualizados.
- `supabase/functions/ai-assistant/tools.ts`: novo módulo `stock_products` no catálogo, com leitura filtrada por `company_id` e liberação nos papéis citados.
- Sem mudança de schema: `stock_products` já tem todos os campos necessários.
