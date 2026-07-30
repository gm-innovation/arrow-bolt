# Política de Segredos — Arrow

Documento de referência sobre quais credenciais podem aparecer no código e quais nunca podem.

---

## 1. O que é público por design (e pode ficar no repositório)

Estes três valores estão no arquivo `.env` e **precisam** estar no bundle JavaScript para o app funcionar no navegador:

| Variável | O que é |
| --- | --- |
| `VITE_SUPABASE_URL` | Endereço público da API do backend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anônima (publishable) usada pelo navegador |
| `VITE_SUPABASE_PROJECT_ID` | Identificador do projeto |

**Por que não é um vazamento:** qualquer pessoa que abra o Arrow no navegador e pressione F12 vê esses valores no código carregado. Eles não dão acesso a nada por si só — quem protege os dados é o **RLS (Row Level Security)**, que avalia a identidade do usuário autenticado em cada consulta ao banco.

> Nunca apague esses valores do `.env` para "aumentar a segurança": sem eles o app publicado quebra silenciosamente.

---

## 2. O que é secreto de verdade (nunca no repositório)

Estes valores vivem **apenas** nos Secrets do backend (lidos em runtime com `Deno.env.get(...)` dentro das Edge Functions) ou nos Secrets do GitHub Actions:

- `SUPABASE_SERVICE_ROLE_KEY` — ignora todo o RLS; acesso total ao banco
- Senha do banco de dados
- `LOVABLE_API_KEY` — gateway de IA e conectores
- Credenciais Omie (`omie_app_key`, `omie_app_secret`)
- Tokens de conectores (GitHub, WhatsApp, e-mail)
- Keystore Android e suas senhas: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

Regra prática: **se o valor dá acesso sem passar pelo login de um usuário, ele é secreto.**

---

## 3. Visibilidade do repositório

O repositório `gm-innovation/arrow` deve ser **privado**.

Mesmo sem segredos versionados, um repositório público expõe:

- todo o código-fonte proprietário e as regras de negócio;
- as migrações SQL — mapa completo do schema e das políticas RLS;
- a lógica das Edge Functions, incluindo endpoints públicos;
- os artefatos de release (`bundle.zip` do OTA), baixáveis por qualquer pessoa.

**Como tornar privado:** GitHub → repositório `arrow` → **Settings** → **Danger Zone** → *Change repository visibility* → **Make private**. A sincronização com o Lovable continua funcionando normalmente, e o fluxo OTA também: a Edge Function `app-update` lê as releases pelo servidor e espelha o bundle no bucket privado `app-bundles`, devolvendo ao app uma URL assinada de curta duração.

---

## 4. Se um segredo vazar

1. **Rotacione imediatamente** o valor comprometido:
   - Chaves do backend: painel do Cloud → rotação de chaves de API.
   - `LOVABLE_API_KEY`: rotação pelo painel do projeto.
   - Credenciais de terceiros (Omie, WhatsApp): gere uma nova no painel do fornecedor e atualize o Secret.
   - Keystore Android: gere uma nova keystore e substitua os Secrets do Actions.
2. Remova o valor do código e faça o deploy.
3. Reveja os logs de acesso do período em que o segredo esteve exposto.
4. Rodar a varredura de segurança do Lovable para checar RLS e políticas.

> Trocar o valor é obrigatório. Apagar o commit **não** resolve: o histórico do Git e os caches do GitHub podem preservar o conteúdo.

---

## 5. Higiene contínua

- O `.gitignore` já bloqueia `*.keystore`, `*.jks`, `keystore.properties`, `google-services.json`, `GoogleService-Info.plist`, `*.p8`, `*.p12`, `*.mobileprovision`, `service-account*.json` e `.env.local`.
- Nunca cole uma chave diretamente em um arquivo `.ts` — sempre use um Secret e leia com `Deno.env.get(...)`.
- Chaves privadas jamais devem ser referenciadas no código do frontend (`src/`); apenas em Edge Functions.
- Revise a aba de Segurança do projeto periodicamente.
