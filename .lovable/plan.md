
# PWA do Arrow — Plano de Implementação (Ondas A, B, C) — v2

Revisão incorporando o feedback: `globPatterns` explícito, kill-switch com `waitUntil` em `install`, `postMessage` para userId, `denylist` no `NavigationRoute`, toast persistente para update, `sw_version` no payload, feature detection iOS/Sync/Badge, e dependências A3→A1 e B4→A1 estáveis.

---

## Onda A — Correções críticas

### A1. Unificar Service Workers (push + cache) via `injectManifest`

- `vite.config.ts`: trocar `strategies` para `injectManifest`, apontar `srcDir: "src"`, `filename: "sw.ts"`.
- `injectManifest.globPatterns` **explícito** (o default do `generateSW` some no `injectManifest`):
  ```ts
  globPatterns: [
    "**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}",
    "assets/**/*.{js,css,woff2,png,svg}",
    "offline.html"
  ],
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
  ```
- Incluir `/offline` (rota estática pré-renderizada ou `offline.html` copiado para `public/`) no precache — pré-requisito de B2.
- Criar `src/sw.ts` unificando:
  - Workbox: `precacheAndRoute(self.__WB_MANIFEST)`, `NavigationRoute` (com denylist — ver B2), `NetworkFirst` para REST Supabase, `NetworkFirst` (não `CacheFirst`) para Storage Supabase, `CacheFirst` para imagens/fontes.
  - Push: `push`, `notificationclick`, `notificationclose` copiados de `public/sw-custom.js`.
  - **Handler `message` desde o dia 1** (necessário para A3):
    ```ts
    let currentUserId: string | null = null;
    self.addEventListener('message', (e) => {
      if (e.data?.type === 'SET_USER_ID') currentUserId = e.data.userId;
      if (e.data?.type === 'CLEAR_USER_CACHE') { /* apaga entradas do userId */ }
      if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
    });
    ```
  - `clientsClaim()` + `skipWaiting()` controlados via `SKIP_WAITING` (para o toast de B3 disparar update imediato).
- Deletar `public/sw-custom.js` após A1 estar em produção.

### A2. Kill-switch com limpeza garantida

Release **N** (antes de A1 ir ao ar): publicar `public/sw.js` mínimo que limpa e desregistra, seguindo o padrão do feedback:

```js
self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .finally(() => self.registration.unregister())
  );
});
```

Release **N+1**: build com `injectManifest` sobrescreve `/sw.js` com o SW unificado. Sem release intermediária de código app entre N e N+1 para evitar confusão.

### A3. Isolamento de cache por usuário (depende de A1)

- No SW (`src/sw.ts`): `currentUserId` em memória, alimentado por `postMessage({ type: 'SET_USER_ID', userId })`.
- `cacheKeyWillBeUsed` dos handlers de REST e Storage prefixa a URL com `currentUserId ?? 'anon'`:
  ```ts
  cacheKeyWillBeUsed: async ({ request }) =>
    `${currentUserId ?? 'anon'}|${request.url}`
  ```
- Trocar `CacheFirst` do Storage por `NetworkFirst` com TTL curto (5 min) para reduzir superfície de vazamento.
- `AuthContext.tsx`:
  - Após hidratar sessão / após `SIGNED_IN`: `navigator.serviceWorker.controller?.postMessage({ type: 'SET_USER_ID', userId })`.
  - No `signOut`: `postMessage({ type: 'CLEAR_USER_CACHE', userId: previousUserId })` antes do `supabase.auth.signOut()`.
- Handler `CLEAR_USER_CACHE` no SW itera `caches.keys()` e apaga entradas com prefixo daquele `userId`.

### A4. Guards de registro

Em `src/main.tsx`, criar helper `shouldRegisterSW()`:

- `!import.meta.env.PROD` → false
- `window.top !== window.self` (iframe) → false
- hostname:
  - `id-preview--*.lovable.app`
  - `preview--*.lovable.app`
  - `*.lovableproject.com`, `*.lovableproject-dev.com`
  - `beta.lovable.dev`, `*.beta.lovable.dev`
- URL contém `?sw=off` → desregistra e retorna false
- `localhost` / `127.0.0.1`: **não registra** por padrão (evita cache atrapalhando dev local); documentado no README. Quem quiser testar SW local usa `?sw=on` ou build de produção.

Em `vite.config.ts`: `devOptions.enabled: false` — remove `dev-dist/` do fluxo. Adicionar `dev-dist/` ao `.gitignore` e apagar o diretório do repo.

### A5. VAPID + push end-to-end

- Confirmar `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` via `secrets--fetch_secrets`. Se ausentes, gerar par e registrar.
- `usePushNotifications` (já existe): confirmar que usa `urlBase64ToUint8Array(VAPID_PUBLIC_KEY)` em `applicationServerKey`. O SW unificado não muda essa parte — apenas herda os handlers `push`/`notificationclick` — mas a chave deve bater com a do backend.
- Teste manual: subscribe → envio via edge function `send-push-notification` → notificação renderizada pelo SW unificado.

**Critérios de saída da Onda A:** um único SW no scope `/`, push chegando em produção, troca de usuário limpa caches, preview/dev não registram SW.

---

## Onda B — Robustez

### B1. Manifest ajustado

Em `vite.config.ts > VitePWA.manifest`:
- `id: "/?source=pwa"`
- `orientation: "any"` (iPad para coordenadores/RH)
- `categories: ["business", "productivity"]`
- `lang: "pt-BR"`
- `screenshots`: 2–3 imagens (Dashboard, OS, HR) — melhora prompt de instalação no Chrome/Edge.

### B2. Página offline

- `src/pages/Offline.tsx`: visual Arrow, botão "Tentar novamente" (`window.location.reload()`).
- Pré-render simples via `public/offline.html` (evita depender do bundle React quando offline), com CSS inline.
- No SW:
  ```ts
  const navRoute = new NavigationRoute(
    async ({ event }) => {
      try {
        return await new NetworkFirst({ cacheName: 'pages' }).handle({ event, request: event.request });
      } catch {
        return caches.match('/offline.html');
      }
    },
    { denylist: [/^\/api\//, /^\/functions\//, /^\/rest\//, /^\/storage\//, /^\/auth\//, /\.[a-z0-9]+$/i] }
  );
  ```
  `denylist` evita que fetch de API retorne o HTML de fallback e quebre o app.

### B3. Prompt de atualização com toast persistente

- Substituir `confirm()` em `src/main.tsx` por toast Sonner **persistente** (`duration: Infinity`) com ações "Atualizar agora" (chama `updateSW(true)` + `postMessage({type:'SKIP_WAITING'})`) e "Depois" (dismiss).
- Link secundário para changelog do PM Dashboard.

### B4. Observabilidade (depende de A1 estável)

**Só entra em release após A1 rodar 1 semana em produção sem regressões** — para não poluir métricas com bugs do SW.

- Migração: `pwa_events (id, user_id, company_id, event_type text, sw_version text, payload jsonb, created_at)` + RLS por `company_id` + `GRANT SELECT, INSERT ... TO authenticated`, `GRANT ALL ... TO service_role`.
- Edge function `log-pwa-event` (verify_jwt = true).
- Eventos:
  - SW: `sw_installed`, `sw_activated`, `sw_update_available`, `sw_update_applied`
  - Instalação: `install_prompted`, `install_accepted`, `install_dismissed`, `appinstalled`
  - Push: `push_permission_granted`, `push_subscription_created`, `push_delivery_failed`
- `sw_version` populado a partir de um `__SW_VERSION__` injetado no build (via `define` do Vite) e ecoado nos eventos originados no SW — permite correlacionar regressão com versão específica.
- Dashboard simples em `/super-admin/pm-dashboard`: adoção PWA, versão SW ativa, taxa de opt-in de push.

### B5. Limpar `dev-dist/`

`.gitignore` + `rm -rf dev-dist/` no repo. Já viabilizado por `devOptions.enabled: false` na A4.

---

## Onda C — Experiência

### C1. Prompt de instalação global e iOS

- `src/components/pwa/InstallPromptProvider.tsx`: captura `beforeinstallprompt` no App root, expõe via contexto.
- Banner discreto para roles `technician` / `coordinator` após 3 sessões, dismiss persistente em `localStorage`.
- **iOS/iPadOS**: feature detection, não UA sniffing:
  ```ts
  const isIOSStandaloneCapable = 'standalone' in window.navigator;
  const isInstalled = (window.navigator as any).standalone === true;
  if (isIOSStandaloneCapable && !isInstalled) showIOSInstructions();
  ```
  Isso cobre iPadOS mesmo quando o UA reporta `Macintosh`.

### C2. Onboarding pós-instalação

- Ouvir `appinstalled` no `InstallPromptProvider` → registrar `pwa_events` + disparar walkthrough `pwa-post-install` via `WalkthroughContext` já existente.

### C3. Fila offline ampliada

- Estender `src/lib/offlineStorage.ts` (Dexie) para: checklists de OS, fotos de execução (compressão via `browser-image-compression` antes de gravar), assinatura do técnico, registros de ponto (HR).
- Padrão de mutação: `queueMutation({ table, op, payload, userId })` com retry exponencial.
- Estratégia de disparo dupla:
  ```ts
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-mutations');
  } else {
    window.addEventListener('online', flushQueue);
  }
  // sempre chamar flushQueue no boot se online
  ```
  iOS/Safari usam o listener `online`; Chrome/Android usam Background Sync.
- No SW: handler `sync` para o tag `sync-mutations` chama endpoints via `fetch` autenticado (o SW já tem o `userId`; o token vem via `postMessage` ou é lido do body enfileirado).

### C4. Feedback visual de pendências

- Ícone contextual por tela indicando mutações pendentes (usar hook `useOfflineSync`).
- Ampliar `PendingChangesDialog` para agrupar por entidade e permitir descartar itens.

### C5. Badge no ícone do app

- Ao mudar contagem de notificações não lidas:
  ```ts
  try { await (navigator as any).setAppBadge?.(unreadCount); } catch {}
  ```
- Nada de feature detection elaborado — try/catch silencioso cobre navegadores sem suporte.

---

## Ordem de execução (com dependências revisadas)

```text
Release N:   A2 (kill-switch em /sw.js)
Release N+1: A1 + A3 + A4 + A5  (SW unificado, isolamento por user, guards, VAPID)
             └── B5 (limpar dev-dist/) — junto porque é parte da mesma mudança de config
Observação:  ~1 semana em produção monitorando regressões
Release N+2: B1 + B2 + B3           (manifest, offline, toast update)
Release N+3: B4                     (observabilidade — só depois de A1 estável)
Release N+4: C1 + C2                (install prompt + onboarding pós-install)
Release N+5: C3 + C4 + C5           (offline profundo + badge)
```

A3 depende de A1 (handler `message` no SW). B4 depende de A1 estável em produção (para não contaminar métricas).

---

## Arquivos que serão tocados

- `vite.config.ts` — `injectManifest`, `globPatterns` explícito, `devOptions.enabled: false`, manifest ajustado.
- `src/sw.ts` (novo) — SW unificado (Workbox + push + message handler).
- `public/sw.js` (temporário, Release N) — kill-switch.
- `public/sw-custom.js` — deletar após A1.
- `public/offline.html` (novo) — fallback offline pré-renderizado.
- `src/main.tsx` — helper `shouldRegisterSW()`, toast de update persistente.
- `src/contexts/AuthContext.tsx` — `postMessage` de `SET_USER_ID` e `CLEAR_USER_CACHE`.
- `src/components/pwa/InstallPromptProvider.tsx` (novo).
- `src/components/pwa/InstallBanner.tsx` (novo).
- `src/pages/Offline.tsx` (novo, opcional se `offline.html` for suficiente).
- `src/lib/offlineStorage.ts` — novos adapters + compressão de fotos.
- `src/hooks/useOfflineSync.ts` — Background Sync + fallback `online`.
- `supabase/functions/log-pwa-event/` (nova edge function) + entry em `supabase/config.toml` com `verify_jwt = true`.
- Migração: tabela `pwa_events` + RLS + GRANT.
- `.gitignore` — `dev-dist/`.

---

## Fora de escopo

- Analytics avançado além do dashboard simples da B4.
- Capacitor / app nativo.
- Login offline com biometria.
