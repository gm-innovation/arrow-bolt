
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4cb88575-f507-4382-bc47-b7a5cefd825f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4cb88575-f507-4382-bc47-b7a5cefd825f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4cb88575-f507-4382-bc47-b7a5cefd825f) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We support custom domains! To deploy your project under your own domain, navigate to Project Settings -> Domains in Lovable. 

Alternatively, if you prefer to use another hosting provider, we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

## App Android (APK) e atualizações OTA

O Arrow roda como app nativo Android via Capacitor. O APK embute o bundle web
(funciona offline) e recebe **atualizações OTA** de HTML/JS/CSS sem reinstalação.

### Gerar o APK de teste (sem keystore)

1. GitHub → Actions → **Build Android APK** → *Run workflow*
2. `build_type`: `debug` · `native_build`: número do build nativo atual
3. Baixe o artefato `arrow-android-debug` e instale no celular

Observações do canal debug:

- O Gradle assina o APK automaticamente com a debug keystore do runner, que é
  **efêmero** — cada APK nativo novo pode exigir **desinstalar o anterior**.
- Atualizações OTA do bundle web funcionam normalmente em APK debug.
- O aparelho precisa permitir **instalação de fontes desconhecidas** (uma vez).
- Para atualizar o APK nativo "por cima", guarde uma keystore de release em
  GitHub Secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) e rode o workflow em `release`.

### Publicar uma atualização OTA

Crie uma tag `vX.Y.Z` no GitHub. O workflow **Publicar bundle web (OTA)** gera
e anexa à Release:

```
bundle.zip      # conteúdo de dist/, index.html na raiz
bundle.sha256
release.json    # version, sha256, minNativeBuild, mandatory, message
```

O app consulta a Edge Function `app-update` na abertura e ao retomar, mostra o
modal de atualização e só baixa após o aceite do usuário. O SHA-256 é validado
antes de aplicar e há rollback automático se o novo bundle não chamar
`notifyAppReady()`.

### Versionamento

- `BUNDLE_VERSION` — versão do bundle web (vem da tag Git).
- `NATIVE_BUILD` — build da casca nativa. **Incremente apenas** quando mudar algo
  nativo (plugin Capacitor, permissão, AndroidManifest, SDK, ícone nativo) e
  publique o bundle correspondente com `minNativeBuild` igual a esse número.
  Aparelhos com APK antigo recebem o aviso "Esta atualização requer uma nova
  versão do aplicativo Android" em vez de baixar um bundle incompatível.

### Configuração do backend

A função `app-update` usa `ARROW_RELEASE_REPO_OWNER` / `ARROW_RELEASE_REPO_NAME`
(já configuradas: `gm-innovation/arrow`) e a conexão GitHub do projeto.

Como o repositório é **privado**, os assets da Release não são acessíveis
publicamente. A função espelha o `bundle.zip` no bucket privado `app-bundles`
e devolve ao app uma **URL assinada** válida por 1 hora. A credencial do GitHub
é usada somente no servidor e nunca é devolvida ao aplicativo.
