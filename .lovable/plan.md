## Problema

A página `/carreiras/lecsor` não mostra "Sobre / Cultura" nem "Benefícios" mesmo com dados cadastrados.

Diagnóstico (verificado agora):
- Banco: colunas `careers_about_*`, `careers_mission`, `careers_values` existem em `companies`, e `company_benefits` tem 1 registro ativo. OK.
- Frontend (`PublicCareers.tsx`): já lê `data.benefits` e `data.company.about_*`. OK.
- Código do edge function (`supabase/functions/public-careers-info/index.ts`): já consulta benefícios e retorna os campos. OK.
- **Resposta real do endpoint hoje:** retorna apenas `{enabled, company:{id,name,logo_url,website_url}, openings}` — sem `benefits` e sem os campos de "Sobre". Ou seja, a versão deployada está desatualizada.

## Correção

Forçar o redeploy do edge function `public-careers-info` para sincronizar com o código-fonte atual. Faremos uma edição mínima e inócua (um comentário/touch no topo do arquivo) para disparar o pipeline de deploy.

Após o deploy, a resposta passará a incluir `company.about_title/about_text/mission/values` e `benefits[]`, e as seções aparecerão automaticamente na página pública (já estão implementadas no front).

## Validação

1. `curl` no endpoint `public-careers-info?slug=lecsor` deve retornar `benefits: [...]` com o "Plano de saúde".
2. Recarregar `/carreiras/lecsor` (hard refresh) — as seções "Sobre" e "Benefícios" aparecem entre o hero e "Vagas abertas".

Nenhuma mudança de schema ou de UI — apenas redeploy.
