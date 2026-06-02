## Problema

O link público em **RH → Recrutamento → Link público** usa `window.location.origin`, então quando o RH acessa o sistema pelo preview (`*.lovableproject.com`) o link copiado/exibido sai com esse domínio em vez do domínio oficial do Arrow (`arrow.googlemarineinnovation.com.br`).

## Plano

1. **Banco** — adicionar coluna `public_site_base_url TEXT` em `public.companies` (nullable). Guarda o domínio público oficial daquela empresa (ex.: `https://arrow.googlemarineinnovation.com.br`). Backfill da Lecsor com esse valor.

2. **UI — `src/pages/hr/Recruitment.tsx`**
   - Buscar também `public_site_base_url` na query da company.
   - Montar `careerLinkBase` priorizando `public_site_base_url` (normalizando: remover `/` final e prefixar `https://` se faltar). Cair para `window.location.origin` apenas se a coluna estiver vazia.
   - Pequeno campo editável (input + botão Salvar) no card "Link público para o site" para o RH ajustar o domínio sem depender do dev. Visível só para RH/diretor (mesma permissão da página).

3. **Edge function `public-careers-info`** — sem mudanças (continua resolvendo por slug).

## Arquivos

- migração SQL nova (`ALTER TABLE companies ADD COLUMN public_site_base_url`)
- `src/pages/hr/Recruitment.tsx` (query, base URL e campo de edição)
