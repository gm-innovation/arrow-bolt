## Objetivo

APK de teste instalável sem keystore próprio + **atualizações OTA do bundle web** entregues por GitHub Releases, com modal de aprovação, verificação de integridade, compatibilidade nativa e rollback seguro.

## Arquitetura

```text
tag vX.Y.Z ──► GitHub Actions ──► Release
                                   ├── bundle.zip      (conteúdo de dist/, index.html na raiz)
                                   ├── bundle.sha256
                                   └── release.json    (version, sha256, minNativeBuild, message)
                                            ▲ metadados (server-side)
                          Edge Function /app-update ──► contrato Arrow simples
                                            │
   APK instalado ──► useAppUpdate ──► AppUpdateDialog ──► download+set ──► reload
                                                                   └── notifyAppReady() ou rollback
```

Decisão de desenho: **fluxo manual**. `autoUpdate: false`, **sem** `updateUrl` — quem consulta a versão é o hook, não o plugin. Não misturar com o auto-update nativo.

## Parte 1 — APK de teste (sem keystore)

1. Corrigir `.github/workflows/android-apk.yml`: os `if:` atuais usam `secrets.*` em contexto de step, o que não é avaliado pelo GitHub Actions. Trocar por um step de detecção que exporta `HAS_KEYSTORE` via `$GITHUB_OUTPUT`.
2. Padrão do `workflow_dispatch` passa a ser `debug`; artefato nomeado por tipo de build.
3. Documentar no README as limitações do canal debug:
   - o Gradle assina automaticamente com a debug keystore do runner (efêmero), logo **cada APK nativo novo pode exigir desinstalar o anterior**;
   - OTA de bundle web funciona normalmente em APK debug;
   - o aparelho precisa permitir "fontes desconhecidas" uma vez;
   - keystore persistente em GitHub Secrets continua sendo o caminho quando for preciso atualizar o APK nativo "por cima".

## Parte 2 — Versionamento e compatibilidade nativa

4. `package.json` está em `0.0.0`. Definir o versionamento do bundle a partir da tag Git (`vX.Y.Z`), injetada no build via `define` do Vite como `__BUNDLE_VERSION__`.
5. Introduzir `__NATIVE_BUILD__` (inteiro, incrementado só quando muda algo nativo: plugin, permissão, manifesto, SDK). Fica embutido no APK e é enviado na consulta de update.
6. `release.json` carrega `minNativeBuild`. Se `minNativeBuild > nativeBuild` do aparelho, o app **não baixa** e exibe: "Esta atualização requer uma nova versão do aplicativo Android."

## Parte 3 — Camada OTA no app

7. Instalar `@capgo/capacitor-updater` na major compatível com Capacitor 8 (`^8`), confirmando a assinatura exata de `download()` e o campo de checksum aceito nessa versão antes de escrever o hook.
8. `capacitor.config.ts`: bloco `CapacitorUpdater` com `autoUpdate: false` e janela de confirmação para o rollback. Sem `updateUrl`.
9. **`NativeAppUpdateProvider`** (`src/components/native/`): monta dentro de Router + AuthProvider e chama `CapacitorUpdater.notifyAppReady()` **somente após bootstrap saudável** (sessão hidratada pelo `AuthContext`, cliente Supabase respondendo, rota principal renderizada). Sem isso o plugin faz rollback automático.
10. `useAppUpdate.ts`:
    - consulta `/app-update` no boot e no evento `resume` do `@capacitor/app` — **apenas consulta, nunca baixa automaticamente**;
    - compara com a versão ativa (`CapacitorUpdater.current()`);
    - baixa só após aceite do usuário, com progresso;
    - valida o SHA-256 antes de aplicar;
    - aplica com `set()` + reload;
    - degrada silenciosamente fora do app nativo (`isNativeApp()`).
11. `AppUpdateDialog.tsx`: modal pt-BR com versão, notas, barra de progresso e "Atualizar agora" / "Depois". Em `mandatory: true`, o "Depois" é desabilitado.

## Parte 4 — Edge Function `app-update`

12. Contrato Arrow próprio (não imita o servidor Capgo):

```json
{
  "updateAvailable": true,
  "version": "1.2.0",
  "url": "https://.../bundle.zip",
  "checksum": "<sha256>",
  "minNativeBuild": 1,
  "mandatory": false,
  "message": "Correções e melhorias.",
  "publishedAt": "2026-07-29T12:00:00Z"
}
```

13. Validações no servidor: `appId` esperado, versão semanticamente maior que a atual, `minNativeBuild` compatível com o `nativeBuild` informado, URL HTTPS, checksum presente, release não é draft/prerelease (salvo canal de teste).
14. Credencial GitHub (conector já disponível) usada **apenas server-side** para ler metadados — nunca devolvida ao app. Se o repositório for privado, a função entrega uma URL pública temporária (asset espelhado em bucket público do Cloud) em vez do link autenticado do GitHub.

## Parte 5 — Pipeline de release

15. Workflow `web-bundle-release.yml` disparado por tag `v*`:
    - `npm ci && npm run build` com `__BUNDLE_VERSION__` da tag;
    - `cd dist && zip -r ../bundle.zip .` (index.html na raiz do ZIP);
    - gera `bundle.sha256` e `release.json`;
    - anexa os três arquivos à Release.

## Validação

16. Teste de rollback proposital: publicar um bundle inválido em aparelho de homologação e confirmar que o app volta ao bundle anterior por ausência de `notifyAppReady()`.
17. Teste de bloqueio: release com `minNativeBuild` maior que o do APK instalado deve exibir a mensagem de atualização nativa, sem baixar.

## Fora de escopo agora

Download restrito a Wi‑Fi, canais de release (beta/produção) e keystore de release persistente — todos encaixáveis depois sem retrabalho da arquitetura.
