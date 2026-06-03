## Problema

A Marina retornou erro: "a coluna 'company' não existe na tabela de leads do site". A ferramenta `query_crm_leads` referencia `company`, mas na tabela `public_site_leads` o campo é `company_name`.

## Correção

Em `supabase/functions/ai-assistant/tools.ts` (linhas 247-248):

- Trocar `"company"` por `"company_name"` no array `fields`
- Trocar `"company"` por `"company_name"` no array `searchFields`

A edge function `ai-assistant` faz redeploy automático, então a próxima pergunta ("tem algum lead?") executará direto sem erro.
