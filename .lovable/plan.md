
# Sprint Final — Encerramento do SGQ Arrow (v2)

Ajustes incorporados: tipos de treinamento ampliados, `origin_type` no programa anual, timeline sem PDF, regra de norma vencida mantida.

---

## 1. GED — Vínculo Norma↔Documento, Badge de Validade e Timeline

### 1.1 Vínculo Norma↔Documento (N:N)
- Criar `quality_document_norms(document_id, norm_id, created_at)` com PK composta, FKs com ON DELETE CASCADE, RLS + GRANTs (master CUD; leitura para autenticados da empresa via join).
- Hook `useQualityDocumentNorms(documentId)` (list/add/remove).
- No `NewDocumentDialog` e no `DocumentDetail`, adicionar **Combobox multi-select** de normas (mantendo o campo livre `normative_reference` como texto auxiliar).

### 1.2 Badge "Norma Referenciada Vencida"
Regra (mantida conforme orientação):
```text
status != 'vigente'
OR valid_until < hoje
OR next_review_due_at < hoje
```
- No `DocumentDetail.tsx`, exibir `<Badge variant="destructive">Norma Referenciada Vencida</Badge>` no header com tooltip listando os códigos das normas em atraso.

### 1.3 Timeline de Revisões (sem PDF)
- Em `DocumentDetail.tsx`, aba **"Histórico de Alterações"** consumindo `quality_document_versions` ordenado desc por `revision_number`.
- Colunas:
  - `revision_label`
  - `revision_date` (= `approved_at` ou fallback `created_at`)
  - `change_summary`
  - `approved_by` (resolvido para nome via `profiles`)
- Sem exportação em PDF nesta sprint.

---

## 2. Pessoas e Treinamentos (§7.2 / §7.3)

### 2.1 Campos novos em `quality_training_plans`
Migração ALTER TABLE:
- `type text` ∈ (`internal`, `external_mandatory`, `external_optional`), default `internal`
- `origin_type text` ∈ (`competency_gap`, `audit`, `ncr`, `legal_requirement`, `customer_requirement`, `iso_requirement`)
- `institution text`
- `instructor text`
- `certificate_url text`
- `program_year int`
- `planned_date date`
- `executed_date date`

Atualizar `TrainingPlanCard` e form para mostrar instituição/instrutor/certificado quando `type` começar com `external_`, e Combobox de `origin_type` em todos os casos.

### 2.2 Programa Anual de Treinamentos
- Página `/quality/training-program` (rota + entrada no menu Competências).
- Tabela filtrada por `program_year` (default = ano atual):
  - Colaborador · Competência/Tema · Tipo · Origem (`origin_type`) · Instituição · Data planejada · Status · Eficácia
- Indicador no topo: **% de Execução = completed / total**.
- Filtros adicionais: tipo, origem, status.

### 2.3 Avaliação de Eficácia
Nova tabela:
```text
quality_training_effectiveness(
  id, company_id,
  training_id → quality_training_plans (ON DELETE CASCADE),
  evaluator_id → auth.users,
  evaluation_date date,
  result text CHECK in ('eficaz','parcial','nao_eficaz'),
  notes text,
  created_at, updated_at
)
```
- RLS: master CUD; leitura para a empresa.
- Botão **"Avaliar Eficácia"** no card/linha do treinamento, habilitado apenas quando `status='completed'`.
- Badge com o último resultado de eficácia na listagem e no programa anual.

### 2.4 Conscientização (Awareness)
```text
quality_awareness_events(
  id, company_id, topic, description,
  event_date date, conducted_by uuid, evidence_url,
  created_at, updated_at
)
quality_awareness_attendees(
  event_id, user_id, acknowledged_at,
  PK(event_id, user_id)
)
```
- Página `/quality/awareness` (subitem de Competências): registrar evento + multi-select de participantes.

---

## 3. UX e Navegação

### 3.1 Sidebar
- **Documentos** → subitens **Normas** e **Termos** (`/quality/documents?tab=norms|terms`).
- **Competências** → subitens **Programa de Treinamentos** (`/quality/training-program`) e **Conscientização** (`/quality/awareness`).

### 3.2 "Abrir NCR" em Satisfação
- Em `SatisfactionDetail.tsx`, botão **"Abrir NCR"** por resposta crítica.
- Deep-link para `/quality/ncrs?new=1&source=satisfaction&response_id=...&description=<encoded>`; `NCRs.tsx` abre o dialog pré-preenchido.

---

## Critérios de aceite
1. PDFs de NC, Calibração e layout ISO continuam gerando com assinaturas.
2. Rayane cria plano `external_mandatory` com `origin_type='customer_requirement'`, conclui e registra avaliação de eficácia.
3. Auditor vê a aba **Histórico de Alterações** com revisão, data, motivo e autor.
4. Documento com norma vencida exibe badge vermelho conforme regra acima.
5. Sidebar reflete o novo agrupamento; botão "Abrir NCR" funciona a partir de uma resposta de satisfação.

---

## Resumo técnico

**Migration única:**
- `quality_document_norms` (+ grants + RLS)
- `ALTER quality_training_plans` (type ampliado, origin_type, institution, instructor, certificate_url, program_year, planned_date, executed_date)
- `quality_training_effectiveness` (+ grants + RLS)
- `quality_awareness_events`, `quality_awareness_attendees` (+ grants + RLS)

**Hooks novos:** `useQualityDocumentNorms`, `useQualityTrainingProgram`, `useQualityTrainingEffectiveness`, `useQualityAwarenessEvents`.

**Componentes/Páginas:**
- `DocumentDetail.tsx` (aba Histórico + badge norma vencida + multi-select normas)
- `NewDocumentDialog.tsx` (multi-select normas)
- `TrainingPlanCard.tsx` + form (type/origin_type + campos externos + Avaliar Eficácia)
- `pages/quality/TrainingProgram.tsx` (novo)
- `pages/quality/Awareness.tsx` + `AwarenessFormDialog.tsx` (novos)
- Sidebar Qualidade: subitens
- `SatisfactionDetail.tsx` + `NCRs.tsx`: deep-link

**Ordem:** migrations → hooks → GED (1.1–1.3) → Treinamentos (2.1–2.3) → Conscientização (2.4) → UX (3) → regressão dos PDFs.
