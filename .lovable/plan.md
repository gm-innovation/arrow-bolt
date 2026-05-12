# Integração com o site institucional (outro projeto Lovable)

Como o site rodará em **outro projeto Lovable** e só precisa de **leads / contato**, a forma mais segura é criar um **endpoint público dedicado** no Arrow, sem expor a API key no front. O time do site só precisa de **uma URL** — nada de chave.

## Arquitetura

```text
Site (Lovable)  ──POST /v1/public/lead──►  Arrow Edge Function  ──►  crm_leads
   form simples              (sem auth)        valida + insere
```

A API key (`ark_live_...`) e os scopes continuam existindo na tela `/super-admin/api-docs` para parceiros externos B2B. O site usa um **canal próprio, mais simples e sem chave**, para evitar vazamento em código client-side.

## O que será criado

### 1. Edge Function pública `public-lead-intake`
- `POST /functions/v1/public-lead-intake`
- `verify_jwt = false` (público)
- CORS liberado para qualquer origem
- Aceita 2 tipos de payload:
  - `type: "rfq"` — solicitação de proposta (com produtos/serviços de interesse)
  - `type: "contact"` — formulário de contato simples
- Validação Zod (nome, email, telefone, mensagem, empresa de destino)
- **Anti-spam**:
  - Rate limit por IP (ex.: 5 req/min) usando tabela `public_lead_rate_limit`
  - Honeypot field (`website` oculto, se preenchido descarta)
  - Tamanho máximo de campos
- Insere em `crm_leads` com `source = 'site'` e `company_id` fixo (multi-tenant resolvido por slug — ver abaixo)

### 2. Roteamento por empresa (slug)
- Como o Arrow é multi-tenant, a função recebe `company_slug` no body
- Tabela `companies` ganha coluna `public_site_slug` (única)
- A função resolve `slug → company_id` e descarta se inexistente/desabilitado
- Coluna `companies.public_intake_enabled boolean default false` para liga/desliga

### 3. Tela de configuração (Super Admin)
Na aba **Integrações** de `/super-admin/api-docs`, novo card **"Captação pública via site"**:
- Por empresa: toggle on/off, definição do slug, URL pronta para copiar
- Botão **"Copiar URL do endpoint"** e **"Copiar exemplo de código"** (snippet `fetch` JS pronto)
- Estatísticas básicas: leads recebidos hoje / 30d

### 4. Notificação ao receber lead
- Insere em `notifications` para coordenadores e diretor da empresa-alvo (já temos o padrão)
- Aparece no Feed corporativo opcionalmente

### 5. Documentação para o time do site
Atualizar `docs/api/README.md` + nova seção em `/super-admin/api-docs`:
- Snippet pronto para colar em qualquer projeto Lovable:
  ```ts
  await fetch("https://iyuypkfksxfsutubcpay.supabase.co/functions/v1/public-lead-intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "rfq",
      company_slug: "google-marine",
      name, email, phone, message,
      items: [{ name: "Calibração de sensor", qty: 2 }]
    })
  });
  ```
- Sem API key, sem auth — pode ir no client-side do site sem risco

## Banco de dados (migration)

```sql
ALTER TABLE companies
  ADD COLUMN public_site_slug text UNIQUE,
  ADD COLUMN public_intake_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE public_lead_rate_limit (
  ip text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_start)
);
-- limpeza periódica via cron ou TTL na função

-- crm_leads: garantir que aceita source='site' (já existe a coluna)
```

RLS: `public_lead_rate_limit` sem políticas (acessada só via service-role na Edge Function).

## Fora de escopo

- A **API key** (`ark_live_...`) e os endpoints `/v1/*` continuam existindo para parceiros B2B externos (ex.: integração com sistema do cliente). Não são removidos.
- Construção do site em si — é responsabilidade do outro projeto Lovable.
- Login de cliente final no site para acompanhar pedido (pode entrar em fase 2).

## Resumo do que você entrega ao time do site

1. **URL única**: `https://iyuypkfksxfsutubcpay.supabase.co/functions/v1/public-lead-intake`
2. **Slug da empresa**: ex. `google-marine` (configurado por você na nova tela)
3. **Snippet de código** copiado da tela Super Admin

Sem chave, sem segredo, sem proxy adicional. O site faz `fetch` direto e o lead aparece no CRM.
