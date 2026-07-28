
# Integração Arrow ↔ Microsoft Teams (Marina como interlocutor) — v3

Plano final incorporando os ajustes técnicos validados.

## Ajustes v3
1. **UNIQUE parcial em `teams_link_codes`:** mantido como índice único parcial (`WHERE consumed_at IS NULL`) — no Postgres isso já garante atomicidade no INSERT.
2. **`EdgeRuntime.waitUntil`:** validar disponibilidade cedo na Fase 2. Fallback documentado: promise não-awaited (funciona quente, sem garantia em cold start).
3. **`test_service_url`:** preenchido automaticamente pelo `teams-bot` na primeira atividade recebida do canal-teste. Documentado na UI ("Preenchido automaticamente após a primeira mensagem recebida no canal de teste").
4. **`ai_messages.channel`:** verificar via `supabase--read_query` no início da Fase 1; se ausente, `ALTER TABLE ai_messages ADD COLUMN IF NOT EXISTS channel text DEFAULT 'web'` na mesma migration.

## Objetivo
Colaboradores conversam com a Marina e disparam ações do Arrow direto do Microsoft Teams. Config em **Super Admin → API & Integrações**, nova aba "Microsoft Teams".

## Decisões consolidadas
- Token Bot Framework: **sem cache**, gerado on-demand.
- JWKS inbound: endpoint canônico `https://login.botframework.com/v1/.well-known/openidconfiguration`, cache 24h em memória.
- `profiles.aad_object_id`: UNIQUE composto `(company_id, aad_object_id)` via índice parcial.
- Link codes: TTL 10 min, 1 código ativo por usuário via índice parcial.
- Adaptive Cards: schema `1.5`.
- Resposta assíncrona: `200 + typing` imediato; resposta final via `teams-send` proativo. `EdgeRuntime.waitUntil` com fallback.
- Logs sanitizados (sem tokens/service_url com auth; AAD mascarado; texto truncado 500 chars).
- Fallback pt-BR em falha da Marina.
- RLS por `company_id` em tudo.

## Escopo funcional

### 1. Nova aba "Microsoft Teams" em `ApiDocs.tsx`
Form com Bot App ID, Tenant ID, agente Marina padrão, modo (menção/DM), Team IDs autorizados, canal de teste, `test_service_url` read-only (auto-preenchido), toggle ativo. Endpoint público do bot exibido para copiar. Botão "Testar conexão". Tabela de logs (últimos 100 com filtros).

Segredos via `add_secret`: `TEAMS_BOT_APP_ID`, `TEAMS_BOT_APP_PASSWORD`, `TEAMS_TENANT_ID`.

### 2. Edge `teams-bot` (`verify_jwt=false`)
- Valida JWT via JWKS canônico (cache 24h).
- Responde `200 + typing` imediato.
- `EdgeRuntime.waitUntil(processMessage(...))` — fallback: promise não-awaited.
- `processMessage`:
  - Se a atividade vem do canal-teste e `test_service_url` está vazio, grava.
  - Comando `/vincular <código>`: consome `teams_link_codes`, grava `profiles.aad_object_id`.
  - Resolve usuário (`aad_object_id + company_id`); se não vinculado, envia card com instruções.
  - Chama `ai-assistant` com `channel='teams'`, `user_id`, `service_url`.
  - Envia resposta via `teams-send`. Fallback pt-BR em erro.
- Log sanitizado a cada etapa.

### 3. Edge `teams-send` (`verify_jwt=true`)
Token client_credentials on-demand. Envia texto ou Adaptive Card 1.5 para `conversation.id` + `service_url`. Usado por: teste de conexão, resposta assíncrona do bot, tool `send_teams_notification`.

### 4. Ajustes em `ai-assistant`
Aceita `channel` no payload, persiste em `ai_messages.channel`. System prompt Teams-aware (curto, Adaptive Cards para listas). Nova tool `send_teams_notification(user_id|team_id, message|card)`.

### 5. Vínculo colaborador ↔ AAD
`/account/settings` → aba "Integrações": botão "Gerar código Microsoft Teams" e "Desvincular Microsoft Teams".

## Plano de execução

```
Fase 1 — Fundação
  0. supabase--read_query: verificar existência de ai_messages.channel.
  1. Migration:
     - ALTER profiles ADD COLUMN aad_object_id text
     - CREATE UNIQUE INDEX profiles_company_aad_uidx
         ON profiles(company_id, aad_object_id) WHERE aad_object_id IS NOT NULL
     - (condicional) ALTER TABLE ai_messages ADD COLUMN IF NOT EXISTS channel text DEFAULT 'web'
     - CREATE TABLE teams_integration_settings (
         company_id uuid PK REFERENCES companies,
         bot_app_id text, tenant_id text, default_agent_id uuid,
         response_mode text CHECK IN ('mention','always') DEFAULT 'mention',
         allowed_team_ids text[] DEFAULT '{}',
         test_channel_id text, test_service_url text,
         active bool DEFAULT false,
         created_at, updated_at)
     - CREATE TABLE teams_integration_logs (
         id, company_id, direction text CHECK IN ('inbound','outbound','error'),
         aad_object_id_masked text, user_id uuid, activity_id text,
         activity_type text, status int, latency_ms int, error text,
         payload_sanitized jsonb, created_at)
     - CREATE TABLE teams_link_codes (
         code text PK, user_id uuid NOT NULL,
         expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
         consumed_at timestamptz, consumed_aad_object_id text,
         created_at)
     - CREATE UNIQUE INDEX teams_link_codes_user_active_uidx
         ON teams_link_codes(user_id) WHERE consumed_at IS NULL
     - GRANTs (authenticated para self; service_role total) + RLS por company_id/user_id
     - Trigger de updated_at nas settings
  2. Secrets via add_secret: TEAMS_BOT_APP_ID, TEAMS_BOT_APP_PASSWORD, TEAMS_TENANT_ID.

Fase 2 — Backend
  3. Smoke test cedo: função placeholder com EdgeRuntime.waitUntil para confirmar
     disponibilidade no runtime do projeto; se falhar, ativar fallback promise.
  4. Edge teams-bot: JWKS canônico + cache 24h; 200+typing; waitUntil(processMessage);
     /vincular; resolver user; ai-assistant; teams-send; log sanitizado; fallback pt-BR.
     Auto-preenche test_service_url na primeira atividade do canal-teste.
  5. Edge teams-send: client_credentials on-demand, texto e Adaptive Card 1.5.
  6. ai-assistant: aceita channel; prompt Teams-aware; tool send_teams_notification.
  7. supabase/config.toml: teams-bot verify_jwt=false; teams-send verify_jwt=true.

Fase 3 — UI
  8. TeamsIntegrationTab.tsx dentro de ApiDocs.tsx (form + endpoint copiável +
     "Testar conexão" + tabela de logs). test_service_url read-only com hint.
  9. /account/settings → aba "Integrações": gerar/desvincular Microsoft Teams.

Fase 4 — Testes e docs
 10. supabase--curl_edge_functions cobrindo: mensagem normal, /vincular,
     usuário sem vínculo, JWT inválido, atividade duplicada (Teams reenvio).
 11. docs/integracoes/teams.md com passo-a-passo (Azure Bot + AAD app registration
     + secrets + primeiro teste).
```

## Segurança
- JWT inbound obrigatório.
- Segredos em `add_secret`, nunca em VITE_ ou repo.
- RLS multi-tenant em toda tabela nova.
- `ai-assistant` roda com `user_id` resolvido (nunca service_role para dados).
- Sanitização dos logs.
- Sem rate limit customizado (limitação conhecida do projeto).

## Fora de escopo
- Cache persistido de token (revisitar se necessário).
- SSO Microsoft para login web.
- Calendário/presença/reuniões (App User Connector futuro).
- Migração dos bindings Outlook/WhatsApp para essa aba.

## Critérios de aceite
- ✅ Aba "Microsoft Teams" em `ApiDocs.tsx` com form, teste e logs.
- ✅ `teams-bot` valida JWT canônico, responde <15s, sanitiza logs, auto-preenche `test_service_url`.
- ✅ `teams-send` envia com token gerado on-demand.
- ✅ `/vincular` grava `aad_object_id` scoped por company.
- ✅ Marina responde no Teams reusando tools, com prompt Teams-aware.
- ✅ Fallback pt-BR em falha.
- ✅ i18n pt-BR em toda UI/mensagem.
- ✅ RLS multi-tenant preservada.
