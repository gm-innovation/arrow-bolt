## Ajustes ao plano: Edge Functions + OpenRouter

### 1. Arquitetura — confirmado Edge Functions (Supabase/Deno)

Sim, todo o backend do agente de IA roda como **Supabase Edge Functions** (Deno). Não usamos TanStack Start porque:
- O projeto já é Vite + React (SPA), não Next/TanStack Start.
- Toda a infra atual de IA (`ai-assistant`, `ai-proactive-check`, `search-reports`, `ingest-knowledge`, `ai-finetune-create`) já está em edge functions, com deploy automático e secrets gerenciados.
- Edge functions resolvem CORS, autenticação JWT, rate limit e cron nativamente.

Nada muda nesse aspecto — apenas explicitando.

### 2. OpenRouter como provedor adicional de LLM

Adicionar **OpenRouter** ao lado do Lovable AI Gateway, permitindo ao Super Admin escolher por agente qual provedor + modelo usar.

#### Mudanças no painel (aba "Tools & Modelo")
- Novo campo **Provedor**: `lovable` (padrão, sem chave) | `openrouter` (requer `OPENROUTER_API_KEY`).
- Campo **Modelo** vira dinâmico:
  - Se `lovable` → lista atual (Gemini 2.5/3, GPT-5.x).
  - Se `openrouter` → lista carregada via `GET https://openrouter.ai/api/v1/models` (cache 1h em `ai_model_catalog` ou em memória da edge function). Inclui Claude, Llama, Mistral, Qwen, DeepSeek, Grok, Command-R, etc. (~300 modelos).
  - Busca/filtro por nome, badge de preço (input/output $/Mtok) e context window.
- Campos extras quando OpenRouter: `route` (`fallback` | `lowest-cost` | `fastest`), `provider_preferences` (allow/deny list opcional).

#### Mudanças no schema
- `ai_agents.tools_model` JSONB ganha:
  - `provider: 'lovable' | 'openrouter'`
  - `model: string` (id no formato do provedor escolhido)
  - `openrouter_route?: string`
  - `openrouter_providers?: string[]`
- Nova tabela leve `ai_model_catalog` (opcional, para cache do catálogo OpenRouter):
  - `id`, `provider`, `model_id`, `display_name`, `context_length`, `input_price`, `output_price`, `modality`, `updated_at`.
  - Atualizada por edge function `refresh-model-catalog` (cron diário).

#### Mudanças nas edge functions
- Novo módulo compartilhado `_shared/llm.ts` com função `callLLM({ provider, model, messages, tools, stream, ... })` que despacha:
  - `lovable` → `https://ai.gateway.lovable.dev/v1/chat/completions` com `LOVABLE_API_KEY`.
  - `openrouter` → `https://openrouter.ai/api/v1/chat/completions` com `OPENROUTER_API_KEY` + headers `HTTP-Referer` e `X-Title` (boas práticas do OpenRouter).
- `ai-assistant` (e futuro `ai-router`, `ai-whatsapp-router`, `ai-teams-webhook`, `ai-outlook-poll`) passam a usar `callLLM`, lendo `provider`/`model` do agente ativo.
- Embeddings (RAG) continuam no Lovable AI Gateway (`google/gemini-embedding-001`) por padrão, com opção futura de usar OpenAI via OpenRouter — fora de escopo agora.
- Fine tuning real continua exclusivo OpenAI (requer `OPENAI_API_KEY`); OpenRouter não oferece fine tuning.

#### Secrets necessários
- `OPENROUTER_API_KEY` (solicitado via `add_secret` quando o Super Admin selecionar o provedor `openrouter` pela primeira vez).
- `LOVABLE_API_KEY` (já existe).
- `OPENAI_API_KEY` (opcional, só para fine tuning).

#### Analytics
- `ai_messages` ganha colunas `provider`, `model`, `prompt_tokens`, `completion_tokens`, `cost_usd` (calculado a partir do catálogo).
- Dashboard mostra custo por provedor/modelo/agente.

### 3. O que NÃO muda
- 8 abas do painel, multi-agentes, RAG, fine tuning, integrações WhatsApp/Teams/Outlook — tudo como planejado.
- UI já implementada (`ToolsModelTab`) recebe apenas o seletor de provedor e a lista dinâmica.

### Fora de escopo
- Streaming de respostas via OpenRouter (será adicionado junto com o refactor do widget na próxima fase).
- Roteamento automático entre provedores por custo/latência (ficará para depois do MVP multi-provedor).

Posso prosseguir com essa atualização?
