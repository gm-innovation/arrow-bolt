## Fase 3 — Contexto Organizacional (ISO §4) — Plano final

**Objetivo:** completar a cláusula 4 da ISO 9001 com SWOT por departamento e ciclo, matriz Poder × Interesse revisável, tipagem semântica do vínculo Parte ↔ Processo, e transformar Processo em hub do SGQ (Documentos + Partes + Riscos + Objetivos + Indicadores).

---

### 1. SWOT por departamento + ciclo de análise

**Banco (`quality_context_items`)**
- `department_id uuid NULL` (FK `departments`) — NULL = corporativo.
- `analysis_period text NULL` — livre (ex.: `2026`, `2026-Q2`, `2026-S1`). Índice `(company_id, department_id, analysis_period, category)`.
- Snapshot em `quality_context_versions` passa a incluir ambos os campos.

**UI — `OrgContext.tsx` (aba SWOT)**
- Filtros no topo: **Departamento** (Corporativo/todos ou específico) + **Período** (combobox com autocomplete a partir dos valores existentes; permite digitar novo).
- Corporativo/todos: agrega itens; badge indicando origem (Corp ou nome do depto) e período.
- Ao criar item: campos Departamento e Período pré-preenchidos com o filtro ativo.

**UI — `ScenarioSwot.tsx`**
- Toggle **Consolidado** vs **Por departamento**; seletor de período.
- Modo "Por departamento": grid de cards, um por depto + card destaque Corporativo; cada card mostra cenário (Ofensivo/Defensivo/Reorientação/Sobrevivência) e scores.
- `computeSwotScenario` aceita filtro por `department_id` e `analysis_period`.

---

### 2. Partes Interessadas — Matriz Poder × Interesse revisável

**Banco (`quality_interested_parties`)**
- `power_level smallint` (1–5)
- `interest_level smallint` (1–5)
- `next_review_date date NULL`

**UI — `InterestedParties.tsx`**
- Formulário: campos Poder, Interesse, Próxima revisão.
- Listagem: badge de status de revisão (`Em dia` / `Vence em X dias` / `Vencida`).
- Nova aba **"Matriz Poder × Interesse"** — recharts ScatterChart 2×2 com quadrantes:
  - Alto poder + Alto interesse → **Gerenciar de perto**
  - Alto poder + Baixo interesse → **Manter satisfeito**
  - Baixo poder + Alto interesse → **Manter informado**
  - Baixo poder + Baixo interesse → **Monitorar**
- Click no ponto abre o detalhe da parte; legenda com contagem por quadrante.
- Dashboard de Revisões (existente): incluir partes com `next_review_date` vencido/próximo.

---

### 3. Parte Interessada ↔ Processo — vínculo tipado

**Banco — nova tabela `quality_interested_party_processes`**
- `party_id`, `process_id` (PK composta)
- `relevance` enum (`low`|`medium`|`high`) — responde "quanto"
- `relationship_type` enum — responde "como":
  `cliente | fornecedor | fiscaliza | recebe_informacao | executa | impacta | influencia`
- GRANTs + RLS por company (padrão qualidade/super_admin).

**Hooks — `useQualityInterestedParties.ts`**
- `linkProcess(partyId, processId, relevance, relationship_type)` / `unlinkProcess`.
- `useInterestedPartyProcesses(partyId)` e o inverso `useProcessInterestedParties(processId)`.

**UI**
- Detalhe da parte: seção **"Processos afetados"** com multiselect + relevância + tipo de relacionamento inline.

---

### 4. Documento Controlado ↔ Processo + Processo como Hub do SGQ

**Banco**
- `quality_documents.process_id uuid NULL` (FK `quality_processes`) + índice.
  (Reaproveita documento existente; sem tabela nova.)

**UI — criação/edição de documento**
- Campo opcional **Processo vinculado** em `NewDocumentDialog` e `EditDocumentMetadataDialog`.

**UI — `Processes.tsx` (detalhe/hub)**
Adicionar abas/seções no processo:
- **Documentos** (via `quality_documents.process_id`) — com atalho para abrir cada documento.
- **Partes interessadas** (via `quality_interested_party_processes`) — mostra tipo + relevância.
- **Riscos** (via `quality_risks` já ligáveis a processo).
- **Objetivos & Indicadores** (via `quality_objectives`/`quality_indicators` já ligáveis).

Cada seção é read-only + link para a tela mestre correspondente. Transforma Processo no hub navegável do SGQ.

---

### Ordem de execução (revisada)

1. **Migration única** — colunas SWOT (`department_id`, `analysis_period`); partes (`power_level`, `interest_level`, `next_review_date`); nova tabela `quality_interested_party_processes` com `relevance` + `relationship_type`; `quality_documents.process_id`.
2. **Hooks** — extensão de `useQualityOrgContext`, `useQualityInterestedParties`, `useQualityProcesses`, `useQualityDocuments`.
3. **Links cruzados** — abas do hub em `Processes.tsx` + campo Processo em documentos + badges de contagem em listagens. (Reutiliza só consultas; valida modelagem cedo.)
4. **UI SWOT** — filtros por depto/período em `OrgContext` e `ScenarioSwot`.
5. **UI Partes** — formulário com Poder/Interesse/Próxima revisão, aba matriz 2×2 e integração com Dashboard de Revisões.

---

### Fora de escopo desta fase
- Árvore/mapa visual integrado (adiado).
- Vínculo Partes ↔ Normas legais (adiado).
- UI de tratamentos (`quality_party_treatments`) — adiado.
