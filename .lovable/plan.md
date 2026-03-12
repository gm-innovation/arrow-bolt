
Objetivo: salvar a logo que você enviou no bucket e fazer ela aparecer no onboarding público imediatamente.

Diagnóstico (confirmado):
- A tela pública já está pronta para renderizar a logo acima do card.
- O `companies.logo_url` da sua empresa está `null`.
- O bucket `company-logos` existe e está público, mas sem arquivo da empresa.
- Então o problema é falta de upload + vínculo no banco (não de layout).
- Os erros de `manifest/auth-bridge` não impedem a logo de aparecer.

Plano de implementação:
1. Criar uma backend function utilitária `upload-company-logo-from-url`.
   - Entrada: `sourceUrl` (URL temporária da imagem enviada no chat).
   - Segurança: só usuário autenticado com role `hr`, `director`, `admin` ou `super_admin`.
   - Buscar `company_id` pelo usuário autenticado (sem aceitar `company_id` arbitrário).
   - Fazer download da imagem, validar `content-type image/*`, sanitizar nome.
   - Upload em `company-logos/{company_id}/logo-{timestamp}.png` com cache busting.
   - Atualizar `public.companies.logo_url` com a URL pública gerada.
   - Retornar `logoUrl` e `objectPath`.

2. Executar a function agora com a logo enviada no chat.
   - Persistir o arquivo no bucket.
   - Confirmar via banco que `companies.logo_url` foi preenchido para a empresa Googlemarine.

3. Validar ponta a ponta.
   - Abrir o link público de onboarding (`/onboarding/:token`) e confirmar a logo acima do card.
   - Se necessário, hard refresh para limpar cache do service worker.

Detalhes técnicos:
- Novo arquivo: `supabase/functions/upload-company-logo-from-url/index.ts`.
- Não precisa mexer em `PublicOnboarding.tsx` nem no hook agora, pois já aceitam `logo_url` em URL absoluta.
- Upload com nome versionado (`timestamp`) + `cacheControl: '0'` para refletir troca imediata.
