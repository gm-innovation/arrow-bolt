## Diagnóstico

O build falhou porque o `package-lock.json` do repositório está desatualizado: ele não contém as dependências instaladas recentemente (Capacitor, Capgo updater, dnd-kit, tiptap, MCP, swagger-ui, etc.). O Lovable gerencia as dependências pelo **Bun** (`bun.lock`, atualizado hoje às 19:55), enquanto o `package-lock.json` reflete um estado antigo. O `npm ci` exige sincronia exata entre `package.json` e `package-lock.json`, então aborta.

Também há avisos de engine: `@capacitor/cli@8.4.2` e `swagger-client` pedem Node >= 22, e os workflows usam Node 20.

## Correção

**1. `.github/workflows/android-apk.yml`**
- Substituir `actions/setup-node` (`cache: npm`) por `oven-sh/setup-bun@v2`, mantendo também `setup-node` com `node-version: 22` (o Gradle/Capacitor CLI precisa de Node no PATH).
- Trocar `npm ci` por `bun install --frozen-lockfile`.
- Trocar `npm run build` por `bun run build`.

**2. `.github/workflows/web-bundle-release.yml`**
- Mesmas trocas: Node 22, Bun para instalar (`bun install --frozen-lockfile`) e `bun run build`.

**3. Remover `package-lock.json` do repositório**
Ele está permanentemente fora de sincronia com o `bun.lock` e só serve para quebrar builds. O `bun.lock` passa a ser a fonte única de verdade.

## Detalhes técnicos

- `bun install --frozen-lockfile` é o equivalente do `npm ci`: falha se o lockfile divergir do `package.json`, garantindo builds reproduzíveis.
- O `bun.lock` (formato texto) é o que o Lovable mantém atualizado; o `bun.lockb` (binário legado) permanece, mas o Bun moderno prioriza o `.lock`.
- Node 22 elimina os avisos `EBADENGINE` e alinha com o requisito do `@capacitor/cli@8`.
- Nenhuma alteração no código da aplicação, na Edge Function `app-update` ou no contrato OTA — apenas na pipeline de CI.

## Depois disso

Rodar novamente **Build Android APK** (`debug`, `native_build: 1`), instalar o APK e então publicar a tag `v0.0.1` para testar a atualização OTA.
