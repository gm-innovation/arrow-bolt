# Saídas de estoque LOGVI como fonte oficial da auditoria de materiais

## O que eu testei agora

Chamei o endpoint com o token informado e ele responde `200`:

- Sem filtro (`{"modulo_id": 41}`): **761 movimentações** de saída, com `meta.total`, `meta.has_more`, `limit`/`offset`.
- Por OS (`{"modulo_id": 41, "os": "4542"}`): retorna só aquela OS (testei com a 4542 — 1 movimentação, item `PRD00089`, quantidade 2).
- Cada movimentação traz `os_numero`, `embarcacao`, `empresa_cliente`, `responsavel_nome`, `coletor_nome`, `custo_total`, `criado_em`, `codigo_movimentacao` e `itens[]` com `produto.{id, codigo, nome, ncm, posicao}`, `quantidade`, `custo_unitario` e `moeda`.
- Tipos presentes: `STB-SERVICO-SAIDA` (470), `STB-VENDA-SAIDA` (251), `STB-CONSUMO` (24), `BAIXA-PERDA` (15), `CONS-INTERNO` (1).

Hoje a auditoria Auvo lê as saídas de um endpoint público da EVA (`get-os-data`), que às vezes vem sem quantidade — nesse caso o sistema **estima 1 unidade por linha** e marca como "quantidade estimada". O endpoint novo traz `quantidade` e `custo_unitario` reais e é autenticado, então passa a ser a fonte primária.

## O que vai ser feito

1. **Segredo do backend**: o `LOGVI_API_TOKEN` já existe (usado nas devoluções); reaproveito o mesmo e atualizo o valor com este token.
2. **Nova fonte de saídas por OS**: a auditoria passa a consultar este endpoint por número de OS (`{"modulo_id": 41, "os": "<numero>"}`), usando apenas as saídas de serviço (`STB-SERVICO-SAIDA`, `STB-CONSUMO`, `CONS-INTERNO`) — vendas (`STB-VENDA-SAIDA`) e perdas (`BAIXA-PERDA`) ficam de fora do cruzamento com relatório técnico.
3. **Fim da quantidade estimada** quando a LOGVI responder: quantidade, custo unitário e moeda vêm do payload. A EVA continua como fallback se a chamada falhar ou não houver token, para a auditoria nunca quebrar.
4. **Mais contexto na tela**: responsável pela saída e coletor passam a ser registrados junto da divergência, ajudando a identificar quem retirou o material.
5. **Reauditoria** dos serviços com pendências de material para que as divergências reflitam as quantidades reais.

## Detalhes técnicos

- Novo módulo `supabase/functions/auvo-sync/withdrawals.ts`: `fetchLogviWithdrawals(token, { orderNumber })` com `POST`, os três cabeçalhos, body `{ modulo_id: 41, os? }`, paginação por `limit`/`offset` seguindo `meta.has_more`, parser tolerante (`data[].movimentacao` + `data[].itens[]`) devolvendo o mesmo shape de `EvaItem` (`external_product_id`, `external_product_code`, `name`, `unit_value`, `quantity`, `quantity_estimated: false`, `vessel`) mais `responsible_name`/`collector_name`.
- `supabase/functions/auvo-sync/index.ts`: em `analyzeServiceGroup`, tenta LOGVI primeiro por OS; em erro/token ausente, cai para `fetchEvaMaterials`. Cache em memória por invocação (uma consulta geral reaproveitada por todas as OS do ciclo, evitando N chamadas).
- Sem mudança de schema: `auvo_material_discrepancies` já guarda quantidade e custo; os nomes de responsável/coletor entram na descrição/`return_reference` existente.
- Nenhuma mudança de UI além do texto das divergências.

## Segurança

O token foi colado no chat, então deve ser considerado exposto. Guardo-o apenas como segredo do backend (nunca no frontend) e recomendo pedir rotação à LOGVI depois que a integração estiver validada.
