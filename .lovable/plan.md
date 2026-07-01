## Rodada C — Contexto da Organização + Processos com múltiplos documentos

### C1. Hub de Contexto da Organização

**Nova subpágina "Identidade Organizacional"** (Missão / Visão / Valores)
- Reaproveitar a tabela `quality_org_context` adicionando 3 colunas: `mission`, `vision`, `values` (texto livre).
- Editável apenas por Master (`is_quality_master`).
- Nova rota `/quality/org-identity` OU nova aba dentro de `RisksHub` (`?tab=identity`).

**Reorganização do Hub**
- Transformar `/quality/risks?tab=context` (OrgContext) em página com blocos/cards que agrupam:
  - Identidade Organizacional (Missão/Visão/Valores) — editável inline
  - Escopo do SGQ (já existe)
  - Questões internas/externas (já existe)
  - Análise SWOT/PESTAL (já existe abaixo)
  - Link para Partes Interessadas
  - Link para Análises Críticas
  - Link para Política da Qualidade

**Filtro por setor no SWOT**
- Adicionar coluna `department_id` (nullable) em `quality_context_items`.
- No formulário de item SWOT/PESTAL: Select opcional de Departamento.
- Na UI de SWOT (`ScenarioSwot` / grid): filtro por departamento no topo.

### C2. Processos com múltiplos documentos vinculados

**Nova tabela `quality_process_documents`**
- Colunas: `process_id` (FK), `document_id` (FK), `relationship_type` enum (`input`, `output`, `reference`, `procedure`), `created_by`, timestamps.
- RLS espelhando `quality_processes` (mesma company via join).
- GRANTs para `authenticated` e `service_role`.

**Hook `useQualityProcessDocuments`**
- `list(processId)`, `link({processId, documentId, relationshipType})`, `unlink(id)`.

**UI no Editor de Processo** (`Processes.tsx` / painel do processo)
- Nova seção "Documentos vinculados" com:
  - Combobox de documento (`quality_documents` publicados da empresa)
  - Select de tipo (Entrada / Saída / Referência / Procedimento)
  - Botão adicionar
  - Lista agrupada por tipo com botão remover
- Preservar compatibilidade: se `quality_processes` tiver coluna única atual de documento (ex.: `document_id`), manter, mas tratar como legado.

### Ordem de execução
1. Migration única: colunas `mission/vision/values` em `quality_org_context`, coluna `department_id` em `quality_context_items`, nova tabela `quality_process_documents` com RLS/GRANTs.
2. Após aprovação: hooks e UI (Identidade, filtro SWOT, vínculos de processo).
3. Entregar para validação antes de qualquer outra rodada.

### Fora de escopo
- Notificações E-mail/WhatsApp (adiado).
- Reescrita do Hub Risks (mantém tabs atuais + acréscimos).
- Módulo Renan, Marketing, Feed.

Confirma para eu iniciar a Rodada C?
