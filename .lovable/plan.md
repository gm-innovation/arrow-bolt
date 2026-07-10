# Marina — Copiloto Completo do Arrow (Suporte + CRUD)

Objetivo: Marina deve (a) responder qualquer dúvida de uso do sistema com base nos manuais oficiais e (b) executar ações CRUD em qualquer módulo, respeitando o papel do usuário.

## Arquitetura da base de conhecimento

**Nova tabela `ai_knowledge_articles`** (RAG com pgvector):
- `id`, `module` (rh/comercial/qualidade/coordenador/financeiro/suprimentos/corp/geral), `role_scope` (array de papéis que podem consultar), `title`, `section`, `content` (markdown), `source` (nome do manual), `page`, `embedding vector(1536)`, `updated_at`.
- Índice HNSW para busca semântica.
- RLS: leitura liberada para authenticated (o filtro por papel é aplicado na tool).

**Pipeline de ingestão** (Edge Function `ai-knowledge-ingest`):
1. Lê os 4 PDFs já gerados (`Manual_RH_v1`, `Manual_Comercial_Marketing_v3`, `Manual_Coordenador_v1`, `Manual_Qualidade`) do bucket `documents`.
2. Extrai texto por capítulo/seção (chunks de ~800 tokens com overlap de 100).
3. Gera embeddings via `openai/text-embedding-3-small` (Lovable AI Gateway).
4. Upsert em `ai_knowledge_articles`.
5. Job idempotente — pode rodar de novo quando um manual for atualizado.

**Manuais faltantes:** gerar versões enxutas em Markdown para módulos sem manual (Financeiro, Suprimentos, Corp, Universidade, Onboarding, Configurações Gerais) e ingerir junto. Isso garante cobertura 100%.

## Novas tools da Marina

Adicionar à Edge Function `ai-chat`:

1. **`search_help(query, module?)`** — busca semântica em `ai_knowledge_articles` filtrada pelo papel do usuário. Retorna top-5 trechos + fonte + página. Marina cita fonte ("Manual RH v1, cap. 4").
2. **`navigate_to(path, reason)`** — devolve ação de navegação que o frontend consome (`AIActionButton` já existe) para levar o usuário direto à tela.
3. **`describe_current_screen()`** — usa o `context.currentScreen` para explicar a tela em que o usuário está e listar ações possíveis.
4. **Tools CRUD por módulo** — completar a cobertura auditando gaps (RH, Qualidade, Comercial, Suprimentos, Financeiro, Corp, Ops). Cada write passa por `isWriteAllowed` + auditoria em `ai_assistant_actions`. Exclusões seguem o handshake HMAC de dupla confirmação já existente.

## Ajustes de prompt e comportamento

Reescrever a system prompt da Marina com:
- **Perfil**: copiloto proativo e resolutivo. Nunca recusar por "falta de filtro" — sempre tentar `search_help` + listagem paginada.
- **Fluxo padrão para dúvidas**: 1) chamar `search_help`, 2) responder com passos numerados, 3) oferecer botão `navigate_to`.
- **Fluxo padrão para ações**: 1) confirmar entendimento, 2) executar tool, 3) mostrar resultado + link para o registro. Exclusões pedem confirmação explícita.
- **Contexto de tela**: sempre considerar `currentScreen` e `role` antes de responder.
- Mapa de rotas por papel (extraído do `App.tsx`) e glossário Arrow.

## Contexto de tela global

Criar `AIContextProvider` que injeta automaticamente `{ route, params, role, selectedRecordId }` em todo `AIAssistant` — hoje só algumas páginas passam contexto rico. Substitui os `context` manuais.

## Painel de gestão

Na página `/super-admin/ai-management`:
- Nova aba **"Base de Conhecimento"**: lista artigos ingeridos, permite reindexar, mostra última atualização por manual.
- Aba **"Ações de Escrita"** (já existe): garantir que lista todos os módulos novos.
- Aba **"Cobertura"**: KPIs de uso da Marina (perguntas respondidas com/sem citação de fonte, ações executadas, taxa de sucesso, top-10 dúvidas).

## Ondas de entrega

1. **Onda 1 — RAG e Suporte**: tabela + ingestão + `search_help` + `navigate_to` + prompt reescrita + ingerir os 4 manuais existentes.
2. **Onda 2 — Manuais faltantes**: gerar Markdown enxuto de Financeiro/Suprimentos/Corp/Universidade/Onboarding/Config e ingerir.
3. **Onda 3 — CRUD completo**: auditar gaps de tools de escrita por módulo e fechar.
4. **Onda 4 — Contexto global + Painel**: `AIContextProvider` + abas Base de Conhecimento e Cobertura.
5. **Onda 5 — QA**: Playwright rodando cenários reais por papel (dúvida, criação, edição, exclusão) em cada módulo; ajustes finos de prompt.

## Detalhes técnicos

- **Modelo de embeddings**: `openai/text-embedding-3-small` (1536 dims, custo baixo, ótimo para PT-BR curto). Coluna `vector(1536)` com HNSW direto.
- **Modelo de chat**: mantém `google/gemini-2.5-flash` (rápido) com upgrade automático para `gemini-2.5-pro` quando o prompt exceder N tokens ou o usuário pedir explicação detalhada.
- **Segurança**: RLS herda do usuário via JWT (já implementado); toda tool de escrita valida `isWriteAllowed`; deletes exigem token HMAC de confirmação.
- **Fonte de verdade dos manuais**: os PDFs em `/mnt/documents/` são a origem, mas ingerimos versões em Markdown (mais estáveis para chunking). Vou manter os `.md` versionados em `docs/manuals/` para reingestão futura.