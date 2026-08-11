# Produtos EVA no Comercial e vínculo com oportunidades

## 1. LOGVI passa a se chamar EVA

Todos os textos visíveis ao usuário passam de "LOGVI" para "EVA": título do painel ("Estoque EVA"), botão "Sincronizar do EVA", mensagens de erro e vazio, e a descrição da ferramenta da Marina. O token continua guardado no backend (nome interno do segredo inalterado, para não quebrar a integração de devoluções do Auvo que usa o mesmo token).

## 2. Tela de Produtos com uma única área de busca

- Remove o botão **"+ Novo Produto"** e o formulário de criação manual — o cadastro é feito por Suprimentos direto no EVA.
- Remove a segunda tabela/segunda busca. Fica **um único card** com **uma única busca** (nome, código, NCM ou categoria) sobre o catálogo, filtro "Só vendáveis" e botão "Sincronizar do EVA".
- A lista mostra código, nome, posição, NCM, quantidade, custo, margem e preço de venda; badges para "sem estoque" e "não vendável".
- Edição local permanece apenas para preço de venda/margem negociada (ícone de edição na linha); a exclusão manual sai, já que a origem é o EVA.

## 3. Produtos vinculados à oportunidade

Hoje a aba "Produtos" da oportunidade só aceita itens do catálogo antigo do CRM (`crm_products`), que não é o catálogo do EVA — por isso o vínculo não reflete o estoque real. Passa a funcionar assim:

- **Vínculo automático na conversão do lead/RFQ:** quando o contato do site já traz itens discriminados, cada item é casado com o catálogo EVA por código e por nome; o que casar entra como item da oportunidade já com quantidade e preço de venda do EVA. O que não casar entra como item livre (nome do que o cliente pediu, sem preço), sinalizado para o comercial completar.
- **Ajuste manual pelo comercial:** buscar e adicionar qualquer produto do catálogo EVA, alterar quantidade, alterar preço unitário negociado (com indicação de desconto sobre o preço de tabela) e remover itens durante a negociação.
- **Valor negociado:** o total dos itens passa a alimentar o valor estimado da oportunidade automaticamente (com opção de travar um valor manual), de modo que os indicadores de pipeline, ganho e perda passem a refletir o que está realmente em negociação.

## Detalhes técnicos

- Renomear `src/hooks/useLogviProducts.ts` → `useEvaStockProducts.ts` e `src/components/commercial/products/LogviStockPanel.tsx` → `EvaStockPanel.tsx`; `syncFromLogvi` → `syncFromEva` em `useStockProducts.ts`. Nome da Edge Function (`logvi-products`) e do segredo permanecem.
- `src/pages/commercial/Products.tsx`: reescrita enxuta — remove `openNew`/dialog de criação, `createProduct`, `deleteProduct` e a tabela duplicada; renderiza só o painel EVA unificado.
- Migração em `crm_opportunity_products`: tornar `product_id` nullable e adicionar `stock_product_id uuid references public.stock_products(id)`, `item_name text`, `item_code text`, `list_unit_value numeric`. GRANT/RLS já existentes preservados; políticas revisadas para incluir `coordinator`/`director` (hoje citam `admin`/`manager`).
- `useOpportunityProducts.ts`: passa a selecionar via `stock_products` (com fallback para `crm_products` nos registros antigos) e a gravar snapshot de nome/código/preço de tabela.
- `OpportunityProductsTab.tsx`: Combobox com busca sobre o catálogo EVA (padrão de Combobox, não lista de cards), campos de quantidade/valor unitário inline e badge de desconto; grava total e dispara atualização de `estimated_value`.
- `ConvertLeadDialog.tsx`: após criar a oportunidade, casar `lead.items` com `stock_products` (código exato → nome normalizado sem acentos) e inserir os itens em `crm_opportunity_products`, informando no toast quantos foram vinculados e quantos ficaram pendentes.
- `supabase/functions/ai-assistant/tools.ts`: textos da ferramenta `query_stock_products` atualizados para "EVA".
