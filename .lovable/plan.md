# Sprint de Fechamento — Planejamento · Melhorias · Partes Interessadas (v2)

Ajuste aplicado: **P3.1 agora usa tabelas relacionais** (`quality_objective_risks` e `quality_objective_parties`) em vez de arrays. Demais itens inalterados.

---

## Prioridade P0 — Alertas e Eficácia (Dia 1–2)

### P0.1 — Alertas de evidências e eficácia vencidas
Estender `useQualityAlerts.ts` com 2 novos kinds:
- `party_evidence_expired` — `quality_interested_party_evidences.valid_until < CURRENT_DATE`
- `improvement_effectiveness_overdue` — `quality_improvements_manual.effectiveness_review_due_at < CURRENT_DATE AND effectiveness_status='pendente'`

Renderizar na sidebar/banner de alertas existente.

### P0.2 — Farol de Indicador (vermelho/amarelo/verde)
Função utilitária `computeIndicatorTrend(indicator, measurements)`:
```text
verde:    último valor >= target
amarelo:  último valor entre 80%–100% do target
vermelho: último valor < 80% do target  OU  sem medição no período da frequência
```
Badge no `Planning.tsx` (aba Indicadores) + KPI no `DashboardHub`.

### P0.3 — Eficácia de Mudança Planejada
**Migração** ALTER `quality_planned_changes`:
- `effectiveness_status text CHECK in ('pendente','eficaz','parcial','nao_eficaz')` default `'pendente'`
- `effectiveness_reviewed_at timestamptz`
- `effectiveness_reviewed_by uuid`
- `effectiveness_notes text`
- `resources_assessment text` (§6.3 d)

Botão **"Avaliar Eficácia"** quando `status='implementada'`, reutilizando o `EvaluateEffectivenessDialog` de Treinamentos.

---

## Prioridade P1 — Consolidação de Melhorias (Dia 2–3)

### P1.1 — Triggers de origem automática
**Migração:** 2 triggers AFTER INSERT:
```text
quality_supplier_incidents → INSERT em quality_improvements_manual
  (origin_type='supplier_incident', priority='high')

quality_calibrations (result='reprovada')
  → INSERT em quality_improvements_manual
  (origin_type='device_failure', priority='high')
```
Ampliar enum/constraint `origin_type` com `supplier_incident` e `device_failure`.

### P1.2 — Retro-vínculo Plano ↔ Origem
Na mutation `generateActionPlan`, após criar o plano:
```text
origem = ncr              → UPDATE quality_ncrs SET action_plan_id
origem = audit_finding    → UPDATE quality_audit_findings SET action_plan_id
(manual já faz)
```
Adicionar `action_plan_id` em `quality_audit_findings` se ainda não existir.

### P1.3 — Eficácia unificada na view consolidada
Recriar `quality_improvements_v` com `effectiveness_status` via COALESCE das 4 origens (`quality_ncrs`, `quality_audit_findings`, `quality_complaints`, `quality_improvements_manual`). Coluna **Eficácia** passa a estar sempre populada em `Improvements.tsx`.

---

## Prioridade P2 — Partes Interessadas (Dia 3–4)

### P2.1 — Histórico de tratativa
```text
CREATE TABLE quality_party_treatments (
  id uuid PK,
  party_id uuid → quality_interested_parties (CASCADE),
  status text CHECK in ('pendente','em_andamento','atendida','nao_aplicavel'),
  notes text,
  decided_by uuid,
  decided_at timestamptz default now(),
  created_at timestamptz default now()
) + GRANTs + RLS
```
Trigger AFTER UPDATE OF `treatment_status` em `quality_interested_parties` insere linha automaticamente.

Aba **"Histórico de Tratativas"** no `InterestedPartyDrawer.tsx`.

### P2.2 — Vínculo Evidência ↔ Documento Controlado
Coluna `document_id` já existe. Adicionar Combobox opcional de `quality_documents` no upload de evidência.

### P2.3 — Cards KPI no Dashboard
3 KPIs novos no `DashboardHub`:
- Partes pendentes de tratativa (`treatment_status='pendente'`)
- Evidências vencidas (`valid_until < hoje`)
- Partes nunca revisadas (`last_reviewed_at IS NULL`)

---

## Prioridade P3 — Planejamento: Rastreabilidade (Dia 4–5)

### P3.1 — Vínculo Objetivo ↔ Risco/Parte (tabelas relacionais)

**Migração — 2 tabelas associativas:**
```text
CREATE TABLE quality_objective_risks (
  objective_id uuid → quality_objectives (CASCADE),
  risk_id      uuid → quality_risks      (CASCADE),
  created_at   timestamptz default now(),
  created_by   uuid,
  PRIMARY KEY (objective_id, risk_id)
)

CREATE TABLE quality_objective_parties (
  objective_id uuid → quality_objectives          (CASCADE),
  party_id     uuid → quality_interested_parties  (CASCADE),
  created_at   timestamptz default now(),
  created_by   uuid,
  PRIMARY KEY (objective_id, party_id)
)
```
GRANTs + RLS herdando a política da empresa via join com `quality_objectives.company_id`. Índices em `risk_id` e `party_id` para consulta reversa.

**Hooks novos:**
- `useObjectiveRisks(objectiveId)` — list/add/remove
- `useObjectiveParties(objectiveId)` — list/add/remove
- Hook reverso (opcional, já no dashboard): `useRiskObjectives(riskId)`, `usePartyObjectives(partyId)`

**Frontend:**
- No dialog de Objetivo: 2 multi-selects (Combobox) — riscos e partes.
- Painel **"Rastreabilidade"** no detalhe do objetivo listando vínculos com link cruzado.
- No detalhe de Risco e de Parte Interessada: nova seção "Objetivos vinculados" (consulta reversa).

**Por quê tabelas e não arrays:** consultas reversas (quais objetivos cobrem este risco?), filtros, joins em relatórios e análise crítica ficam triviais; arrays exigem `ANY()`/`unnest()` em toda query.

### P3.2 — Export PDF do Plano Anual da Qualidade
Componente `QualityPlanPdf.tsx` reaproveitando `QualityDocumentPDF`:
- Capa: ano, empresa, política vinculada
- Seção 1: Objetivos (indicadores filhos + farol + vínculos com risco/parte)
- Seção 2: Mudanças Planejadas (status + eficácia)
- Assinaturas: responsável da qualidade + direção

Botão **"Gerar Plano Anual"** no header de `Planning.tsx`.

---

## Cronograma

```text
Dia 1  P0.1 alertas       + P0.2 farol indicador
Dia 2  P0.3 eficácia mudança + P1.1 triggers origem
Dia 3  P1.2 retro-vínculo + P1.3 view consolidada
Dia 4  P2.1 histórico tratativa + P2.2 vínculo doc + P2.3 KPIs
Dia 5  P3.1 tabelas associativas + UI rastreabilidade + P3.2 PDF
Dia 6  Regressão: alertas, PDFs, RLS, fluxos completos
Dia 7  Homologação com Rayane
```

## Resumo técnico

**Migrações (4 arquivos):**
1. `alter_planned_changes_effectiveness.sql` — P0.3
2. `triggers_improvements_origin.sql` — P1.1 (+ ampliação enum)
3. `recreate_improvements_v_effectiveness.sql` — P1.3
4. `party_treatments_and_objective_links.sql` — P2.1 + **P3.1 (2 tabelas N:N)**

**Hooks alterados/novos:**
- `useQualityAlerts.ts` — +2 fontes
- `useQualityImprovements.ts` — retro-vínculo + eficácia unificada
- `useQualityPlanning.ts` — eficácia mudança
- `useQualityInterestedParties.ts` — `usePartyTreatmentHistory`
- **`useObjectiveRisks.ts`** (novo) — N:N objetivo↔risco
- **`useObjectiveParties.ts`** (novo) — N:N objetivo↔parte

**Componentes novos:**
- `EvaluateChangeEffectivenessDialog.tsx`
- `IndicatorStatusBadge.tsx`
- `PartyTreatmentHistoryTab.tsx`
- `ObjectiveTraceabilityPanel.tsx` (vínculos do objetivo)
- `QualityPlanPdf.tsx`

**Páginas alteradas:** `Planning.tsx`, `Improvements.tsx`, `InterestedParties.tsx`, `DashboardHub.tsx`, `Risks.tsx` (seção "Objetivos vinculados"), `InterestedPartyDrawer.tsx`.

## Critérios de aceite

1. Alerta vermelho quando evidência vence amanhã.
2. Mudança implementada exibe "Avaliar Eficácia"; resultado "ineficaz" entra na view de melhorias.
3. Incidente de fornecedor cria automaticamente linha em Melhorias.
4. Origem NCR em Melhorias mostra eficácia preenchida (não mais "—").
5. Drawer de Parte exibe histórico cronológico de tratativas.
6. Dashboard mostra 3 KPIs de Partes.
7. Objetivo permite vincular múltiplos riscos e partes; **abrindo um risco, vejo a lista de objetivos que o cobrem** (consulta reversa via tabela associativa).
8. Botão "Gerar Plano Anual da Qualidade" produz PDF assinado.

Pronto para aprovar?
