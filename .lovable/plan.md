## Problema

O preflight CORS retorna **HTTP 404 — "Requested function was not found"**. Ou seja, a Edge Function `public-job-application` não está deployada no projeto Cloud, apesar do código existir em `supabase/functions/public-job-application/index.ts` e estar registrada em `supabase/config.toml` com `verify_jwt = false`.

O código da função e o CORS estão corretos — o problema é puramente de deploy.

## Plano

1. **Fazer deploy da Edge Function `public-job-application`** usando a ferramenta de deploy do Lovable Cloud.
2. **Validar com curl OPTIONS** que o preflight passa a retornar `HTTP 200` com `access-control-allow-origin: *`.
3. **Validar fluxo end-to-end**: pedir que você reenvie a candidatura em `https://arrow.googlemarineinnovation.com.br/carreiras/...` e confirmar que cria registro em `job_applications` e o CV em `recruitment-cvs`.

Nenhuma alteração de código, schema, RLS ou config é necessária.