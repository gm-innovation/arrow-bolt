# Revisão de segurança: repositório GitHub público

## Diagnóstico

Verifiquei o que está versionado no repositório `gm-innovation/arrow`:

- O `.env` contém apenas três valores: `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Uma busca por credenciais privadas (`SERVICE_ROLE_KEY`, chaves `sb_secret_`, blocos `-----BEGIN`, tokens Slack, chaves Google) em `src`, `supabase`, `.github`, `public` e `docs` não encontrou **nenhum valor** — todas as ocorrências são apenas nomes de variáveis lidos em runtime via `Deno.env.get(...)` nas Edge Functions.

Conclusão sobre o `.env`: os três valores são **publicáveis por design**. A URL do projeto e a chave anônima (publishable) precisam viajar no bundle JavaScript para o navegador funcionar — qualquer pessoa que abrir o Arrow no navegador já os enxerga no DevTools. Quem protege os dados é o RLS, não o segredo dessas chaves. A chave `service_role` e a senha do banco nunca ficam no código.

O problema real é outro: **o repositório está marcado como `Public`**. Isso expõe todo o código-fonte do Arrow — regras de negócio, lógica das Edge Functions, estrutura de permissões, migrações e as automações do GitHub Actions.

## Riscos concretos do repositório público

| Risco | Impacto |
| --- | --- |
| Código-fonte proprietário exposto | Concorrente pode copiar o produto inteiro |
| Migrações SQL visíveis | Mapa completo do schema, tabelas e políticas RLS |
| Lógica das Edge Functions visível | Facilita achar caminhos de abuso em endpoints públicos |
| Assets de release (`bundle.zip`) baixáveis por qualquer um | Bundle web do app nativo acessível sem autenticação |
| Risco futuro de vazamento acidental | Qualquer commit descuidado com uma chave real vira exposição pública imediata |

## Ações propostas

### 1. Tornar o repositório privado (prioridade imediata)
No GitHub: `gm-innovation/arrow` → **Settings** → seção **Danger Zone** → **Change repository visibility** → **Make private**. A sincronização com o Lovable continua funcionando normalmente.

Efeito colateral esperado: o workflow OTA passa a servir assets privados — o que já está previsto, pois a Edge Function `app-update` acessa as releases via conector GitHub no servidor e espelha o bundle no bucket privado `app-bundles`, devolvendo URL assinada de 1 hora ao app.

### 2. Reforçar o `.gitignore`
Adicionar entradas defensivas para arquivos que nunca devem entrar no repositório, mantendo o `.env` atual versionado (ele é gerado pela conexão do Cloud e a app quebra sem ele):

```
*.keystore
*.jks
google-services.json
GoogleService-Info.plist
.env.local
.env.*.local
```

### 3. Documentar a política de segredos
Criar `docs/seguranca-segredos.md` explicando, em linguagem simples:
- quais valores são publicáveis (URL + anon key) e por que;
- que segredos reais (service role, tokens Omie, chaves de API, keystore Android) só existem nos Secrets do backend e nos Secrets do GitHub Actions;
- o que fazer se algum segredo vazar (rotacionar imediatamente pelo painel).

### 4. Higiene contínua
- Manter a keystore Android fora do repositório (hoje ela é injetada via `ANDROID_KEYSTORE_BASE64` nos Secrets do Actions — correto).
- Rodar a varredura de segurança do Lovable após tornar o repositório privado, para revisar as políticas RLS com calma.

## Detalhes técnicos

- `src/integrations/supabase/client.ts` lê `import.meta.env.VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; o Vite substitui esses valores em build time, então eles ficam no bundle público por definição.
- As Edge Functions usam `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — o valor vive apenas no ambiente do backend, jamais no repositório.
- O workflow `.github/workflows/android-apk.yml` já lê a keystore de Secrets, sem arquivo binário versionado.
- Itens 2 e 3 são as únicas alterações de arquivo; o item 1 é uma ação no painel do GitHub, que só você pode executar.
