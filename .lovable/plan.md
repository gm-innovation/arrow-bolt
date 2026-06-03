
## Painel completo de Gerenciamento do Agente de IA (Super Admin)

Nova página `/super-admin/ai-management` com 8 abas. Configuração global + override por empresa. Tudo editável pelo Super Admin.

---

### 1. Identidade e Personalidade
- Nome, tagline, mensagem de boas-vindas, tom de voz, idioma
- Persona / biografia (textarea longo)
- Avatar do agente (upload)

### 2. Comportamento e Fluxo
- Prompts sugeridos iniciais (chips)
- Instruções por role (technician, coordinator, manager, director, hr)
- Fluxos automáticos (toggles: relatórios, disponibilidade, status OS, ranking)
- Memória de conversa (slider 0-50 mensagens)
- Fallback humano (email/WhatsApp)

### 3. Guardrails
- Tópicos proibidos / permitidos exclusivamente
- Filtro PII (mascara CPF, RG, telefone, email)
- Bloqueio de linguagem ofensiva
- Limite diário por usuário + limite de tokens por resposta
- Disclaimer obrigatório
- Modo aprovação (humano revisa antes de enviar)

### 4. Tools e Modelo
- Modelo principal (Gemini/GPT via Lovable AI Gateway)
- Modelo de imagem separado
- Temperature, max tokens
- Tools habilitáveis: busca em relatórios, disponibilidade, OS, geração de relatório, visão, alertas proativos, knowledge base
- Conhecimento extra (RAG livre)

### 5. Treinamento (Fine Tuning + Upload de PDFs)
- **Base de conhecimento por upload**: Super Admin (ou RH/coordenador da empresa) envia PDFs, DOCX, TXT, planilhas, links de site.
  - Cada arquivo é processado por edge function `ingest-knowledge`: extrai texto (`document--parse_document` no backend via `pdf-parse`/`mammoth`), divide em chunks (~800 tokens), gera embeddings com `text-embedding-3-small` (Lovable AI Gateway) e salva em nova tabela `ai_knowledge_chunks` com `pgvector`.
  - Listagem com status (processando, indexado, erro), tags, escopo (global / por empresa / por role).
  - Botão "Reprocessar" e "Excluir".
- **RAG automático**: edge function `ai-assistant` faz `match_documents` antes de cada resposta, injetando os 5 chunks mais relevantes no contexto.
- **Fine tuning leve (few-shot)**: editor de pares pergunta-resposta exemplares. São anexados ao system prompt como exemplos canônicos. Tabela `ai_training_examples` (pergunta, resposta ideal, tags, agente_id).
- **Fine tuning real (OpenAI)**: aba opcional. Super Admin clica "Exportar dataset JSONL" (gera a partir das conversas com feedback positivo + exemplos curados) e "Iniciar fine tuning" — chama OpenAI Files API + Fine-tuning API via secret `OPENAI_API_KEY`. Status do job exibido em tempo real. Quando concluído, o `model` do agente pode apontar para o ID do modelo fine-tunado (ex.: `ft:gpt-5-mini:org::abc123`).
- **Avaliação**: lista perguntas/respostas com feedback negativo (`ai_feedback`) e permite marcá-las como "exemplo de treinamento" com 1 clique → vira `ai_training_example`.

### 6. Multi-Agentes
- **Vários agentes coexistem**. Nova tabela `ai_agents` (id, name, slug, description, scope, is_default, settings JSONB com todas as 5 áreas acima, knowledge_scope, company_id NULL=global).
- Cada agente tem seu próprio conjunto: identidade, comportamento, guardrails, tools, modelo, treinamento.
- **Roteamento**:
  - Por role (ex.: agente "Eva RH" só para HR, "Marina Técnica" para technicians)
  - Por contexto/rota (ex.: agente "Comercial" em `/commercial/*`)
  - Por intenção (classificador leve roteia perguntas: ex.: "férias" → agente RH)
  - Manual: usuário escolhe agente no header do widget (select)
- **Handoff entre agentes**: agente pode transferir conversa para outro (ex.: técnico pergunta sobre folha de ponto → Marina passa para Eva RH com contexto).
- UI: lista de agentes em cards, criar/duplicar/arquivar, definir agente padrão.

### 7. Integrações Externas
Cada agente pode estar disponível em canais além do widget web.

- **WhatsApp** (já existe infra `send-whatsapp`, `whatsapp-webhook`):
  - Toggle "Atender no WhatsApp" por agente.
  - Mapear número do WhatsApp Business → agente.
  - Webhook recebe mensagem → edge function `ai-whatsapp-router` busca agente, processa com mesma pipeline RAG+tools, envia resposta via `send-whatsapp`.
  - Histórico unificado em `ai_conversations` (com `channel = 'whatsapp'`).
  - Configuração: usar credenciais já existentes (`useWhatsAppSettings`).

- **Microsoft Teams** (novo, via connector `microsoft_teams`):
  - Toggle "Atender no Teams" + seleção de equipes/canais.
  - Bot responde a menções em canais e DMs.
  - Edge function `ai-teams-webhook` recebe eventos do Graph API, processa, responde via gateway `microsoft_teams`.
  - Requer connector linkado (Super Admin conecta via picker).

- **Microsoft Outlook** (novo, via connector `microsoft_outlook`):
  - Toggle "Responder emails" + filtros (pasta, remetente, assunto).
  - Edge function `ai-outlook-poll` (cron a cada 5 min) lê emails não lidos via gateway, gera rascunho de resposta com o agente, e:
    - **Modo sugestão**: salva como draft em `/me/messages` e marca como lido.
    - **Modo automático**: envia resposta direto (`/me/sendMail`) — só se `auto_reply = true` e domínio do remetente está em whitelist.
  - Audit log de todo email processado em `ai_email_activity`.

- **API pública** (bonus): endpoint `/functions/v1/ai-public-chat` com API key por empresa, para embutir o agente em sites de terceiros.

### 8. Analytics (reaproveita `AIAnalyticsTab`)
- Visão global (todas as empresas) e por agente
- Top perguntas, taxa de feedback, custo estimado por modelo, distribuição por canal (web/WhatsApp/Teams/Outlook)
- Custo de fine tuning e tokens consumidos

---

## Detalhes técnicos

**Novas tabelas**:
- `ai_agents` — definição de cada agente (settings JSONB completo, scope, is_default)
- `ai_knowledge_sources` — arquivos/links enviados (filename, type, status, agent_id, company_id, scope)
- `ai_knowledge_chunks` — chunks com embedding `vector(1536)`, FK para source
- `ai_training_examples` — pares Q&A canônicos por agente
- `ai_fine_tune_jobs` — jobs OpenAI (status, model_id, dataset_url, cost)
- `ai_channel_bindings` — agente ↔ canal (whatsapp_number, teams_channel_id, outlook_folder, settings JSONB)
- `ai_email_activity` — log de emails processados pelo Outlook

RLS: Super Admin gerencia tudo; coordinator/director da empresa gerencia agentes da própria empresa; outros roles apenas usam.

**Habilitar extensão**: `CREATE EXTENSION IF NOT EXISTS vector;` + função `match_knowledge_chunks(embedding, agent_id, company_id, top_k)`.

**Storage**: bucket privado `ai-knowledge` para os arquivos originais (download/reprocessamento).

**Novas edge functions**:
- `ingest-knowledge` — processa arquivo → chunks + embeddings
- `ai-router` — recebe pergunta + contexto, escolhe agente, monta prompt com RAG, chama modelo, aplica guardrails
- `ai-whatsapp-router` — handler unificado WhatsApp → agente
- `ai-teams-webhook` — handler Teams
- `ai-outlook-poll` — cron Outlook (5 min)
- `ai-finetune-create` / `ai-finetune-status` — gerenciar jobs OpenAI

**Refatoração**:
- `ai-assistant` passa a chamar `ai-router` internamente (compatibilidade).
- `AIAssistant.tsx` carrega config do agente ativo, aplica visual, mostra seletor de agente.
- Sidebar do Super Admin: novo item "Agente de IA".

**Secrets necessários**:
- `OPENAI_API_KEY` (somente se usar fine tuning real — pedir ao Super Admin quando ele clicar "Habilitar fine tuning")
- Connectors `microsoft_teams` e `microsoft_outlook` (link via `standard_connectors--connect`)
- WhatsApp: usa o que já existe

---

## Fora de escopo
- Editor visual no-code de fluxos
- Voice/telefonia
- Treinamento de modelo from-scratch (apenas fine tuning incremental)
- Suporte a outros provedores LLM além de Lovable AI Gateway + OpenAI (fine tuning)

Posso prosseguir?
