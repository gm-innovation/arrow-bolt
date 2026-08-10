# Ligar de fato a API de retornos da LOGVI

A lógica de devolução já está implementada; o que falhou foi só a chamada HTTP. Testei agora com o token que você forneceu e confirmei:

- O endpoint **só responde em POST** (GET retorna `404 Not Found` — foi exatamente o erro que apareceu).
- Com `POST` + `Authorization: Bearer …` retorna `200` com `total: 1144` retornos, `meta.has_more`, e cada movimentação com `os_numero`, `embarcacao`, `criado_em`, `responsavel_nome` e `itens[].produto.{id, codigo, nome}` + `quantidade` e `custo_unitario`.
- O parser atual já entende esse formato; o problema é apenas método, autenticação e paginação.

## O que vai mudar

1. O token entra como segredo do backend (`LOGVI_API_TOKEN`) — nada de chave no código nem no frontend.
2. A busca de retornos passa a usar `POST` com os cabeçalhos de autenticação/JSON e a percorrer todas as páginas (`limit`/`offset`, seguindo `meta.has_more`) para trazer os 1.144 registros, com teto de segurança de páginas.
3. Se o token não estiver configurado ou a chamada falhar, a auditoria segue como hoje (sem quebrar), apenas registrando o motivo no log.
4. Depois disso, os serviços com pendências de material são reauditados para que os falsos positivos de "material retirado sem relato" virem "Devolvido ao estoque".

## Detalhes técnicos

- `supabase/functions/auvo-sync/returns.ts`: `fetchStockReturns()` passa a receber o token, usar `method: "POST"`, `Authorization: Bearer ${token}`, `Content-Type`/`Accept: application/json`, body `{ limit, offset, date_from, date_to }`, e acumular `data` enquanto `meta.has_more` (páginas de 500). Mantém o parse tolerante já existente.
- `supabase/functions/auvo-sync/index.ts`: lê `Deno.env.get("LOGVI_API_TOKEN")`; sem token, salta a etapa de retornos com log explícito. Cache em memória por invocação (uma chamada reaproveitada por todos os serviços do ciclo).
- Nenhuma mudança de schema (as colunas `returned_quantity` e `return_reference` já existem) e nenhuma mudança de UI.

## Segurança

Você colou o token no chat, então ele deve ser considerado exposto. Recomendo pedir à LOGVI a rotação dessa chave depois que a integração estiver funcionando; guardo o valor atual apenas como segredo do backend.
