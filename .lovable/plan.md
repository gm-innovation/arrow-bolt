
## Objetivo

Hoje a aba **Treinamento** trata toda a base de conhecimento e todos os exemplos few-shot como **globais** — qualquer trecho pode ser recuperado para qualquer usuário. Precisamos permitir que cada item seja marcado como:

- **Global** (comportamento atual — todos os usuários)
- **Por papel** (um ou mais: `super_admin`, `director`, `coordinator`, `technician`, `hr`, `commercial`, `financeiro`, `qualidade`, `compras`, `marketing`)
- **Por módulo** (um ou mais: `pm`, `hr`, `quality`, `crm`, `operations`, `finance`, `supplies`, `corp`, `ai`)

Um item pode combinar os dois filtros (ex.: "manual do coordenador operacional" = papel `coordinator` + módulo `operations`).

## O que já existe

- `ai_knowledge_sources` já tem colunas `tags text[]` e `scope jsonb` — hoje não usadas na UI.
- `ai_training_examples` já tem `tags text[]`.
- A tool `search_knowledge` chama a RPC `match_ai_knowledge` **sem filtro de escopo** (linha 956 de `tools.ts`).

Ou seja, o banco já suporta o modelo; falta UI + filtro na recuperação.

## Mudanças

### 1. UI — `src/components/super-admin/ai/TrainingTab.tsx`

Nas duas abas ("Base de conhecimento" e "Exemplos few-shot"):

- Novo bloco **Escopo** no formulário de criação, com 3 opções em RadioGroup:
  - `Global` (padrão)
  - `Por papel(is)` → multi-select com os papéis suportados
  - `Por módulo(s)` → multi-select com os módulos
  - Combinável: se ambos preenchidos, o item só é recuperado quando *papel* **e** *módulo* baterem.
- Persistência:
  - `ai_knowledge_sources.scope = { roles: string[], modules: string[] }` e espelho em `tags[]` como `role:hr`, `module:quality` para permitir filtros SQL simples.
  - `ai_training_examples.tags[]` no mesmo padrão (sem coluna `scope` — evita nova migração).
- Lista de itens: mostrar chips de escopo (`Global`, `Papel: Coordenador`, `Módulo: RH`) e filtro no topo (`Todos | Global | Meus papéis | Módulo X`).
- Edição de escopo inline (botão "Editar escopo" em cada linha) via `update` na tabela.

### 2. Recuperação — filtrar por escopo do usuário

Em `supabase/functions/ai-assistant/tools.ts` (tool `search_knowledge`):

1. Antes da RPC, carregar em memória `ai_knowledge_sources` do agente com id, scope e tags.
2. Calcular o conjunto de `source_ids permitidos` para o usuário corrente:
   - Sempre incluir sources com `scope` vazio/`Global`.
   - Incluir sources cujo `scope.roles` contenha `ctx.role`.
   - Incluir sources cujo `scope.modules` contenha o módulo derivado de `ctx.route` (mapa simples: `/hr/* → hr`, `/admin/* → operations`, `/quality/* → quality`, `/commercial/* → crm`, `/finance/* → finance`, `/supplies/* → supplies`, `/corp/* → corp`, `/super-admin/pm-* → pm`).
   - Se `roles` **e** `modules` estiverem preenchidos, exigir os dois.
3. Chamar `match_ai_knowledge` como hoje, e **pós-filtrar** os chunks retornados por `source_id ∈ permitidos`. (Evita mudar a RPC.)
4. Few-shot: quando o `ai-assistant` injeta exemplos no prompt, filtrar `ai_training_examples` pela mesma regra (tags).

### 3. Sem migração de banco

Não precisamos alterar schema — só passamos a **usar** `scope`/`tags` que já existem. Único ponto: garantir que UPDATE via `update_ai_knowledge_sources` no cliente respeite RLS existente (já OK — mantido `.eq('agent_id', agent.id)`).

## Fora do escopo

- Não mexer em fine-tuning nem no pipeline de ingestão (`ingest-knowledge`).
- Não alterar a RPC `match_ai_knowledge` (pós-filtro em JS resolve).
- Não introduzir cache — a lista de sources permitidos é lida a cada chamada de `search_knowledge`.

## Verificação

- Cadastrar 3 fontes: 1 Global, 1 papel=`coordinator`, 1 módulo=`hr`.
- Como `super_admin`, todas aparecem em busca.
- Como `technician`, só a Global.
- Como `hr` navegando em `/hr/*`, aparecem Global + módulo `hr`.
