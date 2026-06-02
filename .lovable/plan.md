## Problema

A página `/carreiras/lecsor` mostra "Página indisponível" mesmo com `public_intake_enabled = true` no banco.

Causa: `src/pages/careers/PublicCareers.tsx` consulta `companies` e `job_openings` diretamente via cliente anônimo (`supabase.from(...).select(...)`). Essas tabelas **não têm policy de SELECT para o role `anon`** (só `authenticated`/super_admin/etc). O `.maybeSingle()` retorna `null`, então o componente cai no fallback de página indisponível.

Não queremos abrir SELECT público em `companies`/`job_openings` (vaza dados internos). A solução correta é uma edge function pública que devolve só os campos necessários.

## Plano

1. **Nova edge function `public-careers-info`** (`verify_jwt = false`, registrada em `supabase/config.toml`, com CORS igual à `public-job-application`).
   - Entrada: `?slug=lecsor`
   - Usa service role para:
     - buscar company por `public_site_slug` e checar `public_intake_enabled`
     - se desativada/inexistente → `{ enabled: false }`
     - se ativa → retorna `{ enabled: true, company: { id, logo_url }, openings: [{id,title,area,description,location,employment_type}] }` (apenas `is_active = true`)

2. **Refatorar `PublicCareers.tsx`**
   - Substituir as duas queries Supabase do `useEffect` por um único `fetch` para a nova edge function (com `apikey` header).
   - Tratar resposta: se `enabled === false` → mostra "Página indisponível"; senão popula `companyId`, `companyLogo`, `openings`.
   - Resolução do `logo_url` (storage `corp-documents`) continua no cliente.

3. **Nada mais muda**: fluxo de envio (`public-job-application`), formulário, validações, RLS de tabelas internas — tudo permanece igual.

## Arquivos

- `supabase/functions/public-careers-info/index.ts` (novo)
- `supabase/config.toml` (registrar função com `verify_jwt = false`)
- `src/pages/careers/PublicCareers.tsx` (trocar queries por fetch)
