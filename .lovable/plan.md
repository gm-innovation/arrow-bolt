# Credenciais da Evolution API editáveis pelo frontend

## Contexto

Hoje os 4 valores da Evolution (`EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_TOKEN`) só existem como variáveis de ambiente do cofre — não há como o app gravá-los em runtime. Para editar pela tela do Super Admin, a configuração passa a viver no banco, **criptografada**, com uma Edge Function como única porta de entrada/saída. Os env vars continuam funcionando como fallback (compatibilidade).

Confirmado na exploração: os consumidores dos segredos são `whatsapp-config` (status/teste/pareamento), `whatsapp-out` (envio), `whatsapp-in` (validação do token do webhook) e a fábrica `getChannelAdapter` em `_shared/channels.ts`. A tabela `api_integrations` é das chaves B2B da API pública do Arrow e **não** serve para isso.

## Arquitetura

```text
Painel Super Admin ──> whatsapp-config (ação save_config, JWT super_admin/diretor)
                          │ criptografa AES-GCM (chave em APP_CONFIG_ENCRYPTION_KEY)
                          ▼
                  integration_settings (só service_role; RLS sem políticas)
                          ▲
   whatsapp-in / whatsapp-out / whatsapp-config leem via getEvolutionConfig()
   (banco primeiro → fallback para env vars)
```

## O que será construído

### 1. Migration — tabela `public.integration_settings`

Colunas: `id text` PK (`'evolution'`), `api_url text`, `instance text`, `api_key_ciphertext text`, `webhook_token_ciphertext text`, `updated_by uuid`, `created_at`, `updated_at`.

- `GRANT ALL ... TO service_role` apenas — **nenhum** grant para `anon`/`authenticated`.
- RLS habilitado sem políticas: inacessível via API de dados; só Edge Functions com service key tocam a tabela.

### 2. Segredo `APP_CONFIG_ENCRYPTION_KEY`

Gerado com `generate_secret` (nunca exibido). As funções derivam a chave AES-GCM via SHA-256 — o banco guarda só ciphertext.

### 3. Helper `_shared/integrationSettings.ts`

- `encryptValue`/`decryptValue` (AES-GCM, IV aleatório por valor, base64).
- `getEvolutionConfig(admin)` → lê a linha `evolution`, descriptografa e retorna `{ apiUrl, instance, apiKey, webhookToken, source }`; se não houver linha, cai nos env vars.
- `saveEvolutionConfig(admin, fields, userId)` → upsert; campos de segredo em branco **mantêm** o valor atual (permite trocar a URL sem redigitar a API key).

### 4. Consumidores migrados para a config do banco

- `channels.ts`: nova fábrica assíncrona `resolveChannelAdapter(channel, admin)` que usa `getEvolutionConfig`; `EvolutionAdapter` inalterado.
- `whatsapp-out`: usa `resolveChannelAdapter` e valida `x-webhook-token` contra o token da config.
- `whatsapp-in`: cria o cliente admin, busca a config e valida o token contra ela (fallback env); mantém o `503 configured:false` quando nada existe.
- `whatsapp-config`:
  - **GET**: lê da config e reporta `configured`, `source` (`database`/`env`), `apiUrl` e `instance` completos (não são segredos) e flags `apiKeySet`/`webhookTokenSet` — nunca valores em claro.
  - **POST `save_config`**: valida URL (https), instância não vazia; grava criptografado; registra em `corp_audit_log`; se um **novo** webhook token foi salvo, retorna a webhook URL completa **uma única vez** na resposta (é o momento em que o admin precisa copiá-la para a Evolution).
  - Ações `test` e `pairing_code` passam a usar a config do banco.

### 5. Painel — card "Credenciais da Evolution" (`EvolutionAPIConfig.tsx`)

- Formulário com 4 campos: URL da API, Nome da instância, API key (password), Token do webhook (password).
- Placeholders indicam o estado atual ("https://evo.exemplo.com" preenchido com o valor atual; senhas mostram "•••••••• cadastrada — deixe em branco para manter").
- Botão **"Gerar token"** no campo do webhook: gera hexadecimal aleatório (64 chars) no navegador e o exibe para copiar — o mesmo valor vai para o cofre do app e para a URL do webhook na Evolution.
- Ao salvar com token novo: modal/destaque com a **webhook URL completa** para copiar (só exibida nesse momento; depois volta a ficar mascarada).
- O card **"Conectar instância ao WhatsApp"** (pareamento) passa a renderizar sempre: desabilitado com aviso "cadastre as credenciais acima" quando não configurado — resolve o "nada apareceu no front".
- Checklist de segredos passa a refletir a config do banco; a nota "Project Settings → Secrets" vira menção de fallback legado.

### 6. Documentação

Atualizar `docs/whatsapp-evolution-setup.md`: configuração agora é feita pela tela do Super Admin; env vars só como fallback.

## Segurança

- Segredos nunca trafegam de volta ao navegador em claro — só flags/máscaras; a webhook URL completa aparece uma única vez, no ato da troca do token.
- Tabela sem acesso via API de dados (sem grants, RLS sem políticas).
- Escrita exige JWT de `super_admin` ou `director` e grava auditoria em `corp_audit_log`.
- Chave de criptografia vive exclusivamente em env secret.

## Arquivos

| Arquivo | Ação |
| --- | --- |
| Migration `integration_settings` | Criar — tabela + grant service_role + RLS |
| `supabase/functions/_shared/integrationSettings.ts` | Criar — criptografia + get/save da config |
| `supabase/functions/_shared/channels.ts` | Editar — `resolveChannelAdapter` assíncrona |
| `supabase/functions/whatsapp-config/index.ts` | Editar — GET via config, ação `save_config`, audit |
| `supabase/functions/whatsapp-in/index.ts` | Editar — token via config |
| `supabase/functions/whatsapp-out/index.ts` | Editar — adapter + token via config |
| `src/components/super-admin/settings/EvolutionAPIConfig.tsx` | Editar — card de credenciais + pareamento sempre visível |
| `docs/whatsapp-evolution-setup.md` | Editar — novo fluxo de configuração |
