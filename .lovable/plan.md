# Corrigir captação de leads do site Lecsor

## Diagnóstico

Confirmei o que o time externo reportou:

- **404 NOT_FOUND** em `https://iyuypkfksxfsutubcpay.supabase.co/functions/v1/public-lead-intake` — a função existe no código (`supabase/functions/public-lead-intake/index.ts`), mas nunca foi efetivamente publicada no projeto. Por isso a resposta CORS que aparece no preflight é a padrão do gateway (sem `content-type`), não a da função.
- **Slug e empresa já corretos no banco**: `Lecsor Technology` → slug `lecsor`, `public_intake_enabled = true`. Nada a ajustar aqui.
- **CORS no código já está OK**: o `index.ts` já devolve `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`. Quando a função for publicada, o preflight vai passar.

Ou seja, o problema é **somente de deploy** — não há bug no código nem no slug.

## Passos

1. **Forçar o deploy da função `public-lead-intake`** no projeto Supabase do CRM (`iyuypkfksxfsutubcpay`) via tool de deploy de edge functions. Nenhuma alteração de código é necessária.
2. **Validar com `curl` real** (preflight `OPTIONS` + `POST`) que:
   - Retorna 200 no preflight com `content-type` listado em `Access-Control-Allow-Headers`.
   - Retorna 200 no POST com payload válido (`type: "contact"`, `company_slug: "lecsor"`).
   - Retorna 404 `unknown_or_disabled_destination` para slug inexistente (sanity check).
3. **Confirmar registro do lead** consultando `public_site_leads` para o `company_id` da Lecsor após o teste.
4. **Sobre o header `apikey`**: como a função está marcada `verify_jwt = false` em `supabase/config.toml`, o gateway **não exige** `apikey` nem `Authorization` do chamador. O time do site **não precisa** receber chave nenhuma — basta o `fetch` com `Content-Type: application/json` e o body. Vou confirmar isso no teste do passo 2.

## Detalhes técnicos

- Tool usada: `supabase--deploy_edge_functions` com `["public-lead-intake"]`.
- Comando de validação (mesmo que o time externo sugeriu):
  ```bash
  curl -i -X POST https://iyuypkfksxfsutubcpay.supabase.co/functions/v1/public-lead-intake \
    -H "Origin: https://lecsor.lovable.app" \
    -H "Content-Type: application/json" \
    -d '{"type":"contact","company_slug":"lecsor","name":"Teste","email":"teste@x.com","message":"ping","website":""}'
  ```
- Se o POST falhar com 500, abro `supabase--edge_function_logs` para `public-lead-intake` e corrijo.

## Fora de escopo

- Mudanças no site externo (Lovable da Lecsor) — não há nada para alterar lá depois do deploy.
- Alterar slug, nome de empresa ou flag `public_intake_enabled` (já estão certos).
- Remover/alterar a API key B2B `ark_live_...` — segue valendo para parceiros, é um canal separado.
