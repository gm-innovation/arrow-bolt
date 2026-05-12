# API pública + Swagger para integração com o site institucional

## Contexto

O site público da empresa (institucional) precisa enviar para o CRM:
- **Solicitações de proposta (RFQs)** — visitante preenche formulário e vira oportunidade no CRM.
- **Solicitações de produto/serviço do catálogo** — viram oportunidade já vinculada ao produto.
- **Cadastro/atualização de contatos (leads)** — viram clientes/buyers no CRM.

Portanto a API precisa principalmente de **escrita**, com leitura limitada (catálogo de produtos público).

Tudo documentado em **Swagger embutido** no app, mais a documentação interna das Edge Functions e do REST do Supabase.

## Decisões tomadas (você delegou)

**Webhooks de saída ficam para a fase 2.** Razão: o site é o produtor de eventos, não o consumidor. Quando você quiser que o CRM notifique o site (ex.: "proposta enviada", "venda confirmada") aí faz sentido. Por enquanto, o site só envia → não precisa receber callback.

**Escopos da API key serão granulares desde o início**, mesmo que hoje só usemos um:
- `leads:write` — criar/atualizar contatos e clientes
- `opportunities:write` — criar oportunidades (RFQ)
- `catalog:read` — listar produtos públicos
- (futuros) `crm:read`, `sales:read`, `webhooks:manage`

A API key do site terá só os 3 primeiros. Isso evita ter que migrar depois.

**Rate-limit:** 120 req/min por API key, in-memory na Edge Function (suficiente para o tráfego de um site institucional). Migração para tabela só se necessário.

## Arquitetura

```text
Site institucional (público)
      │  POST /v1/leads/rfq
      │  Authorization: Bearer ark_live_...
      ▼
┌──────────────────────────────────────────┐
│  Edge Function: public-api               │
│  - valida API key + escopo               │
│  - resolve company_id da integração      │
│  - rate-limit por integração             │
│  - audit log em api_request_logs         │
│  - usa SERVICE_ROLE para escrever        │
└──────────────────────────────────────────┘
      │
      ▼
   Postgres (clients, crm_buyers, crm_opportunities, crm_opportunity_activities)
```

## Escopo

### 1. Banco — gestão de integrações

Novas tabelas:

- `api_integrations` — `id`, `company_id`, `name`, `key_hash` (sha256), `key_prefix` (8 chars visíveis), `scopes text[]`, `status` ('active'|'revoked'), `created_by`, `last_used_at`, `created_at`.
- `api_request_logs` — `id`, `integration_id`, `method`, `path`, `status`, `latency_ms`, `ip`, `user_agent`, `error_message`, `created_at`.

RLS: só `director` e `super_admin` da empresa veem/gerenciam suas integrações e logs.

Função: `public.verify_api_key(_key text)` → retorna `{ integration_id, company_id, scopes }` ou null.

### 2. Edge Function `public-api` (`verify_jwt = false`)

Roteador único. Endpoints **v1** focados no site:

**Leads / Clientes**
- `POST /v1/leads/rfq` — solicitação de proposta (cria/atualiza `clients` + `crm_buyers` + `crm_opportunities` + `crm_opportunity_activities`).
  - Body: `{ company: {...}, contact: {...}, request: { type, message, products?: [{id, qty}], vessel?: {...} } }`
  - Idempotência via header `Idempotency-Key`.
- `POST /v1/leads/contact` — só captura de lead simples (newsletter / fale conosco).
- `GET /v1/leads/{id}` — consulta status (para o site mostrar "sua proposta foi recebida").

**Catálogo (read-only, público para o site)**
- `GET /v1/catalog/products` — paginado, filtros por categoria/segmento.
- `GET /v1/catalog/products/{id}`.
- `GET /v1/catalog/services` — serviços recorrentes do `useRecurrences`.

**Padrões**
- Resposta: `{ data, pagination?, request_id }` ou `{ error: { code, message, details? }, request_id }` (RFC 7807 friendly).
- Paginação: `?page=1&page_size=50` (max 100).
- Erros HTTP: 400 validação (Zod), 401 sem key, 403 escopo insuficiente, 404, 409 conflito (idempotência), 429 rate-limit, 500.

### 3. Especificação OpenAPI 3.1

Arquivo consolidado em `public/api/openapi.yaml`, escrito à mão para a parte pública e gerado para o resto:

```text
public/api/openapi.yaml         # consolidado, servido ao Swagger UI
docs/api/
  README.md                     # guia para integradores
  paths/
    public-v1/                  # API pública (manual, prioridade)
      leads.yaml
      catalog.yaml
    edge-functions/             # Edge Functions internas (manual)
      omie-proxy.yaml
      ai-assistant.yaml
      ...
    rest/                       # PostgREST (gerado de types.ts)
  components/
    schemas/                    # Lead, Opportunity, Product, Error, Pagination
    security.yaml               # ApiKeyAuth + BearerAuth (interno)
scripts/
  generate-rest-openapi.ts      # gera paths/rest/* a partir de types.ts
  bundle-openapi.ts             # junta tudo em public/api/openapi.yaml
```

Rodar `bun run docs:api` regera `public/api/openapi.yaml`.

### 4. UI no app — `/admin/api-docs`

Rota protegida (`super_admin` + `director`). Duas abas:

- **Documentação** — Swagger UI (`swagger-ui-react`) carregando `/api/openapi.yaml`. "Try it out" funciona com a API key colada pelo usuário.
- **Integrações** — lista as `api_integrations` da empresa:
  - Botão "Nova integração" → modal com nome e seleção de escopos → gera key → **mostrada uma única vez** (com botão copiar e aviso).
  - Cada linha: nome, prefixo (`ark_live_a1b2c3...`), escopos, último uso, status, ações (revogar).
  - Sub-página "Logs" por integração: últimas 100 chamadas (path, status, latência, timestamp).

Item de menu em **Configurações → API & Integrações** para director/super_admin.

Dependências novas: `swagger-ui-react`, `@types/swagger-ui-react`.

### 5. Documentação para o site (parceiro)

`docs/api/README.md` com:
- Auth: `Authorization: Bearer ark_live_...`.
- Quickstart: enviar uma RFQ em curl + JS fetch.
- Idempotência: como usar `Idempotency-Key`.
- Versionamento: `/v1` é estável; breaking changes vão para `/v2` com 6 meses de overlap.
- Códigos de erro completos.
- Limites: 120 req/min, body max 1MB.

## Detalhes técnicos

- **Formato API key:** `ark_live_<32 bytes base62>`. Armazenamos `sha256(key)` em `key_hash` + `key_prefix` (primeiros 8 chars depois do prefixo) para identificação.
- **Bypass de RLS:** `public-api` usa `SUPABASE_SERVICE_ROLE_KEY`. Toda autorização é em código com `company_id` da integração + escopos.
- **Validação de input:** Zod em todo handler. Sem exceção.
- **CORS:** `*` (server-to-server, mas permite testes do navegador).
- **Idempotência:** chave armazenada por 24h em uma tabela leve `api_idempotency_keys (key, integration_id, response_hash, created_at)` — retorna a mesma resposta se a key se repetir.
- **Audit log:** sempre escrito, mesmo em erro. Campo `last_used_at` da integração atualizado de forma "best-effort" (não bloqueia).
- **Swagger UI** carregado client-side; `openapi.yaml` é asset estático em `public/`, sem segredos.

## Fora desta entrega (fase 2 explícita)

- Webhooks de saída do CRM para o site (notificar status de proposta, venda).
- SDK TypeScript/Python gerado.
- OAuth2 client credentials (só vale a pena com múltiplos parceiros).
- Endpoints de escrita para `sales`, `tasks`, `vessels` (adicionar quando o site precisar).

## Resumo do que vai ser construído nesta fase

1. Migração: `api_integrations`, `api_request_logs`, `api_idempotency_keys`, função `verify_api_key`, RLS.
2. Edge Function `public-api` com endpoints `POST /v1/leads/rfq`, `POST /v1/leads/contact`, `GET /v1/leads/{id}`, `GET /v1/catalog/products`, `GET /v1/catalog/products/{id}`, `GET /v1/catalog/services`.
3. `public/api/openapi.yaml` (escrita manual da parte v1 + Edge Functions; geração automática do REST via script).
4. Página `/admin/api-docs` com Swagger UI + gestão de integrações (criar/listar/revogar/logs).
5. `docs/api/README.md` para integradores.
