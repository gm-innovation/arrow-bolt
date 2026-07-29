## Objetivo

Transformar o Arrow em um app Android nativo (Capacitor) instalável por APK, reaproveitando 100% do código web atual, com acesso completo aos recursos do celular. O PWA continua funcionando para quem não instalar o APK.

## O que já existe

- `useGeolocation` grava check-in/check-out/tracking em `technician_locations` (com endereço via Mapbox).
- `GeolocationButtons.tsx` na área do técnico; mapa de últimas posições em `TechnicianLocations.tsx`.
- PWA completa (manifest, service worker, offline com Dexie, web push).

Falta a camada nativa e os recursos que o navegador não entrega.

---

## Onda 1 — Base Capacitor

- Instalar `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`.
- Criar `capacitor.config.ts` (appId `app.lovable.4cb88575f5074382bc47b7a5cefd825f`, appName `Arrow`, hot-reload para o sandbox em dev).
- Criar `src/lib/platform.ts` com `isNativeApp()` — todo recurso nativo tem fallback web, sem telas duplicadas.
- Splash screen e ícone do app com a identidade Lecsor.

## Onda 2 — Câmera e GPS no check-in

- `@capacitor/camera` + `@capacitor/geolocation`.
- `useNativeCamera.ts`: câmera do sistema no app; `<input capture>` no navegador.
- `useGeolocation` passa a usar o plugin nativo quando disponível (precisão e permissões melhores).
- Foto anexada ao check-in: coluna `photo_path` em `technician_locations` + bucket privado `checkin-photos` com RLS por empresa/técnico.

## Onda 3 — Rastreamento em segundo plano

- `@capacitor-community/background-geolocation` com notificação persistente ("Arrow está registrando sua localização").
- `useBackgroundTracking.ts`: liga no check-in, desliga no check-out; nunca roda sem tarefa ativa.
- Buffer offline dos pontos e sincronização posterior.
- Throttle configurável (distância mínima / intervalo) para não inflar a tabela.
- Opt-in explícito do técnico + flag de consentimento em `profiles` (exigência do Google Play e LGPD).
- Coluna `battery_level` opcional junto de cada ponto.

## Onda 4 — Push nativo e deep links

- `@capacitor/push-notifications` com Firebase Cloud Messaging; token salvo em `push_subscriptions` com marcação de plataforma.
- Edge function de envio passa a despachar para web push **e** FCM conforme o tipo de inscrição.
- Deep links (`@capacitor/app` + App Links): notificação ou link do WhatsApp abre direto a OS/tarefa correspondente, reaproveitando `notificationRoutes.ts`.

## Onda 5 — Biometria e scanner QR

- `@capacitor-community/biometric-auth`: após o primeiro login, o técnico entra por digital/Face; sessão guardada em armazenamento seguro do dispositivo.
- `@capacitor-mlkit/barcode-scanning`: leitura de QR/código de barras para identificar embarcação, equipamento, instrumento de calibração e item de EPI.
- Gerador de QR nos cadastros correspondentes (instrumentos do SGQ e EPIs), para imprimir e colar no ativo.

## Onda 6 — Offline robusto e compartilhamento

- `@capacitor-community/sqlite` como storage do `offlineStorage.ts` no app nativo (Dexie continua no navegador) — mais confiável para estaleiro/alto-mar.
- `@capacitor/filesystem` + `@capacitor/share`: salvar o PDF do relatório no dispositivo e enviar direto pro WhatsApp/e-mail do cliente.
- Anexar arquivos do celular sem as limitações do navegador iOS.

## Onda 7 — Navegação, chamada e sensores

- Botões na OS: abrir rota no Waze/Google Maps e ligar para o contato do cliente com um toque.
- `@capacitor/network`: indicador real de conexão substituindo o `OfflineIndicator` atual baseado em `navigator.onLine`.
- `@capacitor/device` e `@capacitor/haptics`: nível de bateria junto ao rastreamento e feedback tátil em confirmações críticas.
- Bússola/orientação disponível para uso em inspeções (exposta como hook, aplicada onde fizer sentido depois).

## Onda 8 — Build e distribuição do APK

A Lovable não compila APK; o build acontece após exportar para o GitHub:

1. Export to GitHub → `git pull`
2. `npm install`
3. `npx cap add android`
4. `npm run build && npx cap sync`
5. `npx cap open android` → Build → Generate Signed Bundle/APK → APK
6. Distribuir o `.apk` por link/WhatsApp (técnicos precisam permitir "fontes desconhecidas")

Também deixo pronto um **GitHub Action** que gera o APK assinado a cada tag de release e publica em Releases — assim você baixa o link sem precisar do Android Studio no dia a dia.

---

## Detalhes técnicos

- Permissões no `AndroidManifest.xml`: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION`, `CAMERA`, `POST_NOTIFICATIONS`, `USE_BIOMETRIC`, `NFC` (reservada), `INTERNET`.
- Android 10+ exige pedir a permissão de background em uma segunda etapa, após a de primeiro plano — o fluxo de opt-in trata isso.
- FCM exige o arquivo `google-services.json` do Firebase e a chave de servidor guardada como secret no backend.
- A keystore de assinatura é gerada uma vez e deve ser guardada com segurança; perdê-la impede atualizar o mesmo app.
- Migrações: `technician_locations.photo_path` e `battery_level`, consentimento de rastreamento em `profiles`, coluna de plataforma em `push_subscriptions`.
- iOS fica preparado (mesmo código Capacitor), mas gerar o IPA exige Mac + conta Apple — fora do escopo agora.

## Entrega

Ondas 1 a 7 implementadas no código + o workflow de build automático. A geração e assinatura do APK precisam ser executadas por você fora da Lovable (ou pelo GitHub Action).
