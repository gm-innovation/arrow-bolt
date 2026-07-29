## Diagnóstico

O App ID atual é `app.lovable.4cb88575f5074382bc47b7a5cefd825f`. O Capacitor rejeita porque o último segmento começa com um dígito (`4cb...`) — cada segmento precisa começar com letra, no formato de pacote Java.

## Correção

Adotar o App ID **`br.com.lecsor.arrow`** (válido em Android e iOS) e propagá-lo nos 4 pontos onde ele aparece:

1. **`capacitor.config.ts`** — `appId: 'br.com.lecsor.arrow'`.
2. **`src/lib/appVersion.ts`** — `APP_ID = 'br.com.lecsor.arrow'` (enviado pelo app na consulta de update).
3. **`supabase/functions/app-update/index.ts`** — `EXPECTED_APP_ID = 'br.com.lecsor.arrow'`; redeploy da função.
4. **`.github/workflows/web-bundle-release.yml`** — campo `appId` do `release.json` gerado.

Como reforço, adicionar `--skip-appid-validation` não é necessário — o ID novo passa na validação nativa.

## Detalhes técnicos

- O App ID vira o `applicationId` do Gradle e o nome do pacote Android; mudá-lo agora é seguro porque nenhum APK foi publicado ainda.
- Os três valores (config nativa, constante do app, validação na Edge Function) e o `release.json` precisam bater exatamente, senão o OTA responde `manifest_app_id_mismatch`.
- Nenhuma release existe ainda, então não há manifesto antigo para migrar.

## Depois disso

Rodar **Build Android APK** (`debug`, `native_build: 1`), instalar e publicar a tag `v0.0.1` para testar o OTA.
