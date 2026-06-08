# Onda 7 — Revisada (fundação documental primeiro)

Reordenação aplicada: PDFs antes de telas. Layout vira fundação; Normas/Termos herdam dele. Navegação consolidada em itens existentes. Relacionais em vez de arrays/jsonb onde houver consulta/auditoria.

---

## 7A.1 — Padronização Documental (PRIMEIRO)

Fundação. Sem isso, qualquer PDF feito depois precisa ser refeito.

### 1. ControlledDocPdfFrame (base)
- Componente compartilhado `src/components/quality/pdf/ControlledDocPdfFrame.tsx`
- Estende o que já existe em `QualityDocumentPDF.tsx`, generalizando:
  - Cabeçalho: logo, código, título, revisão, data, página x/y
  - Rodapé: elaborado/verificado/aprovado, cópia controlada
  - Watermark configurável (CÓPIA NÃO CONTROLADA / OBSOLETO / RASCUNHO)
  - Capa opcional com escopo + referência normativa
- Consome `quality_settings.document_layout` (já existe via `LayoutGlobal.tsx`)
- Props padronizadas para reutilização em NC, Calibração, Atas, Procedimentos

### 2. Registro Formal de NC PDF (LECSOR)
- Botão "Imprimir registro" em `NcrDetail`
- Usa `ControlledDocPdfFrame`
- Conteúdo: identificação, descrição, causa raiz, ações corretivas, eficácia, assinaturas
- Marca d'água "Cópia controlada"

### 3. Certificado de Aferição PDF (Googlemarine)
- Botão "Emitir certificado" em `DeviceDetail`
- Usa `ControlledDocPdfFrame` com layout Googlemarine (logo + cores definidas em settings)
- Conteúdo: dados do equipamento, padrões usados, checkpoints, resultados, validade, responsável técnico
- Persiste URL em `quality_calibrations.certificate_pdf_url`

---

## 7A.2 — Estrutura Documental ISO (DEPOIS)

Já herdam o `ControlledDocPdfFrame`.

### 4. Referências Normativas — UI
- Página dentro de **Documentos** (não cria item novo na sidebar)
- Tab nova em `DocumentsHub.tsx`: `?tab=norms`
- Tabela `quality_reference_norms` (já existe — 22 colunas)
- CRUD: código, título, edição, escopo, link externo, anexo PDF, status (vigente/obsoleta), próxima revisão
- Vínculo via tabela relacional `quality_document_norms (document_id, norm_id)` — NÃO array
- Badge "Norma vencida" quando `next_review_at < now()`

### 5. Termos e Definições — UI
- Tab nova em `DocumentsHub.tsx`: `?tab=terms`
- Tabela `quality_terms` (já existe — 14 colunas)
- CRUD: termo, definição, fonte (norma), sinônimos, abreviação
- Busca por termo/sinônimo
- Tooltip reutilizável `<TermTooltip term="..." />`

**Sidebar resultante (sem novos itens):**
```
Documentos
 ├─ Documentos
 ├─ Cópias Controladas
 ├─ Lista Mestre
 ├─ Documentos da Empresa
 ├─ Normas               ← novo (tab)
 └─ Termos               ← novo (tab)
```

---

## 7B — Pessoas e Treinamentos

### 6. Programa Anual de Treinamentos
- Tab nova em **Competências** (consolidar, não criar item solto)
- Tabela `quality_training_plans` já existe (19 col); estender com:
  - `origin_type` enum: `competencia | auditoria | ncr | exigencia_legal | cliente | iso`
  - `program_year int` para visão anual
- Calendário anual + visão por colaborador / competência / departamento
- Geração automática a partir da Matriz (lacunas de competência)
- Indicador: % executado no ano

### 7. Treinamento Externo (formal)
- Estender `quality_training_plans`:
  - `training_type` enum: `interno | externo`
  - `mandatory boolean` (externo obrigatório vs facultativo)
  - `institution`, `instructor`, `hours`, `cost`
  - `certificate_url`, `certificate_number`
  - `approval_status` enum: `solicitado | aprovado | realizado | reprovado`
- Formulário externo separado em `ExternalTrainingForm.tsx`
- Workflow: solicitado → aprovado → realizado → eficácia

### 8. Avaliação de Eficácia de Treinamento
- Nova tabela `quality_training_effectiveness`:
  - `training_plan_id`, `evaluator_id`, `evaluation_date`
  - `result` enum: `pendente | eficaz | nao_eficaz`
  - `evidence`, `notes`
  - `due_at` (30/60/90 dias após realização)
- Alerta `training_effectiveness_due` em `quality_alerts_v`
- Se não eficaz → botão "Abrir ação" (gera improvement)

### 9. Conscientização Estruturada (§7.3)
- Nova tabela `quality_awareness_events`:
  - `title`, `topic` enum (politica | objetivos | contribuicao | consequencias)
  - `related_policy_version_id`, `event_date`
- Tabela relacional `quality_awareness_event_attendees (event_id, user_id, acknowledged_at)` — NÃO jsonb
- Lista de presença digital com aceite por usuário
- Vínculo opcional com `quality_communication_log`

**Sidebar Competências resultante:**
```
Competências
 ├─ Matriz
 ├─ Treinamentos
 ├─ Programa Anual       ← novo
 └─ Conscientização      ← novo
```

---

## 7C — Timeline visual de revisões (pequena, antecipada)

Originalmente na Onda 8. Antecipada porque auditor pede.

- Componente `<DocumentRevisionTimeline documentId={...} />`
- Lê de `quality_document_versions` (já existe — 18 col)
- Visual: linha do tempo com revisão (00, 01, 02…), data, autor, motivo da alteração
- Embutida em `DocumentDetail` (tab "Histórico")
- Sem nova tabela; só leitura + UI

---

## Onda 8 (fora deste escopo, registrado)

- Auditoria recorrente (scheduler mensal)
- Integração Satisfação → Melhoria/NCR (botão "Abrir NCR" em `SatisfactionDetail`)
- Política pública externa (`/politica-qualidade`)
- Perspectivas BSC em objetivos (se DOCX exigir)
- Download counter avançado em normas
- Embeddings em conhecimento
- `ai-proactive-check` consumindo flag de push

---

## Detalhes técnicos

### Migration 7A.1 (mínima — só PDFs/layout)
- `ALTER quality_calibrations ADD certificate_pdf_url text`
- (Layout já configurável via `quality_settings.document_layout` existente)

### Migration 7A.2
- Já existem `quality_reference_norms` e `quality_terms`. Só:
  - `CREATE TABLE quality_document_norms (document_id uuid, norm_id uuid, PRIMARY KEY(document_id, norm_id))` + GRANTs + RLS por company
  - Eventual `next_review_at`, `status` em `quality_reference_norms` se faltarem

### Migration 7B
- Enum `quality_training_origin` e `quality_training_type`
- ALTER `quality_training_plans`: + `origin_type`, `training_type`, `mandatory`, `program_year`, `institution`, `instructor`, `hours`, `cost`, `certificate_url`, `certificate_number`, `approval_status`
- `CREATE TABLE quality_training_effectiveness` + GRANTs + RLS
- `CREATE TABLE quality_awareness_events` + `quality_awareness_event_attendees` + GRANTs + RLS
- Atualizar `quality_alerts_v` com `training_effectiveness_due`

### Componentes/Hooks
- `ControlledDocPdfFrame`, `CalibrationCertificatePdf`, `NcrFormalPdf`
- `useQualityNorms`, `useQualityTerms`, `useQualityDocumentNorms`
- Estender `useQualityTrainingPlans` (já existe)
- `useQualityTrainingEffectiveness`, `useQualityAwareness`
- `DocumentRevisionTimeline`

### Sequência de entrega
1. **7A.1** — Layout + NC PDF + Calibração PDF (1 ciclo curto)
2. **7A.2** — Normas + Termos como tabs em Documentos (1 ciclo)
3. **7B** — Programa + Externo + Eficácia + Conscientização (1 ciclo maior)
4. **7C** — Timeline visual (pequeno; pode entrar junto com 7B se sobrar tempo)

Confirma essa ordem? Começo por **7A.1 (ControlledDocPdfFrame + NC PDF + Certificado de Calibração)**?
