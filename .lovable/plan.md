
# Sprints 3.6 e 3.7 — Fechamento ISO 9001 (revisão final)

Duas sprints irmãs, mesmo padrão arquitetural já usado em 3.2/3.5 (tabelas com `company_id` + RLS Master, views agregadas em `quality_alerts_v` / `quality_improvements_v`, página dedicada + cards no Dashboard).

Master = `super_admin | director | coordinator | qualidade` via `quality_is_master(auth.uid())` já existente.

Ajustes finais aplicados:
- **3.6 — Status automático após avaliação (Opção A)**: o trigger `quality_supplier_after_evaluation_trigger` chama `quality_supplier_next_status(p_score, p_open_critical_incidents)` e grava o resultado em `evaluations.status_after` e em `suppliers.status`. Master continua podendo sobrescrever manualmente na tela do supplier (UPDATE direto).
- **3.7 — Bucket dedicado `quality-calibrations`** (privado), separado de `quality-documents`. Policies em `storage.objects` permitem leitura/escrita para Master OU `responsible_user_id` do device referenciado no path `{company_id}/{device_id}/...`.
- **3.7 — Refresh on-mount**: `useQualityDevices.ts` dispara `supabase.rpc('quality_device_status_refresh')` em `useEffect(..., [])` ao montar a página de Calibração, antes do `useQuery`. Garante que `next_calibration_due < hoje` atualize `status = 'overdue'` sem precisar de cron/edge function nesta sprint.

---

## Sprint 3.6 — Provedores Externos (§8.4)

Objetivo: cadastrar fornecedores críticos, qualificar inicialmente, avaliar desempenho periodicamente, manter "lista de aprovados" auditável e expor reavaliações vencidas como alertas SGQ.

Não há tabela `suppliers` no projeto hoje (somente `purchase_requests` sem FK). Esta sprint cria a entidade.

### 1. Banco de dados (1 migration)

#### Enums
- `quality_supplier_category`: `material | service | calibration | training | software | logistics | other`.
- `quality_supplier_status`: `pending | approved | conditional | suspended | disqualified`.
- `quality_supplier_evaluation_kind`: `initial | periodic | incident | requalification`.
- `quality_supplier_criticality`: `low | medium | high | critical`.

#### Tabelas (todas com `company_id`, RLS, GRANTs `authenticated` + `service_role`)

- **`quality_suppliers`** — `name`, `tax_id`, `category`, `criticality`, `status` (default `pending`), `contact_name/email/phone`, `scope_description`, `notes`, `requalification_frequency_months` (default 12), `last_evaluation_at`, `next_evaluation_due`, `current_score numeric(5,2)`, `current_grade text`, `owner_user_id`, `created_by`. UNIQUE`(company_id, tax_id)` parcial onde `tax_id IS NOT NULL`.
- **`quality_supplier_evaluations`** — `supplier_id`, `kind`, `evaluation_date`, `period_start/end`, `score`, `grade`, `status_after`, `evaluator_id`, `summary`, `recommendations`, `next_due_at`.
- **`quality_supplier_evaluation_criteria`** — `evaluation_id`, `criterion_code` (`quality|delivery|price|support|compliance|safety`), `weight`, `score`, `notes`.
- **`quality_supplier_documents`** — `supplier_id`, `document_type`, `file_url`, `file_name`, `valid_until`, `uploaded_by`.
- **`quality_supplier_incidents`** — `supplier_id`, `incident_date`, `severity` (`low|medium|high|critical`), `description`, `linked_ncr_id` (FK opcional `quality_ncrs`), `resolved_at`.

#### Integração
- `purchase_requests`: adicionar `supplier_id uuid REFERENCES quality_suppliers(id)` (nullable, sem cascade).

#### Funções (SECURITY DEFINER + `SET search_path = public`)
- `quality_supplier_compute_score(p_evaluation_id)` — `SUM(score*weight)/SUM(weight)`; atualiza `score` e `grade` (A ≥ 90, B ≥ 75, C ≥ 60, D < 60) na própria evaluation.
- `quality_supplier_next_status(p_score numeric, p_open_critical_incidents int) RETURNS quality_supplier_status` — utilitário **chamado pelo trigger** (Opção A): `p_open_critical_incidents > 0 → 'suspended'`; `p_score >= 75 → 'approved'`; `p_score >= 60 → 'conditional'`; `p_score < 60 → 'suspended'`; `NULL → 'pending'`.
- `quality_supplier_after_evaluation_trigger()` — AFTER INSERT/UPDATE em `quality_supplier_evaluations`:
  1. conta `open_critical = COUNT(*) FROM quality_supplier_incidents WHERE supplier_id = NEW.supplier_id AND severity='critical' AND resolved_at IS NULL`;
  2. `v_status := quality_supplier_next_status(NEW.score, open_critical)`;
  3. grava `NEW.status_after = v_status` (se ainda NULL);
  4. UPDATE `quality_suppliers` SET `current_score = NEW.score, current_grade = NEW.grade, status = v_status, last_evaluation_at = NEW.evaluation_date, next_evaluation_due = NEW.evaluation_date + (requalification_frequency_months || ' months')::interval`.
  > Master pode sobrescrever `quality_suppliers.status` via UPDATE direto na UI a qualquer momento.

#### Triggers
- `BEFORE INSERT` em `quality_supplier_evaluations`: se `score IS NULL`, chama `quality_supplier_compute_score`.
- `AFTER INSERT OR UPDATE` em `quality_supplier_evaluations`: `quality_supplier_after_evaluation_trigger`.
- `BEFORE INSERT` em `quality_suppliers`: se `next_evaluation_due IS NULL`, define `now() + interval '6 months'`.

#### Extensão de views
- `quality_alerts_v` ganha duas fontes:
  - `source='supplier'`, `category='requalification'`: `due_soon` ≤ 30d, `overdue` < hoje; só para `status IN ('approved','conditional')`.
  - `source='supplier'`, `category='pending_qualification'`: `status='pending'` há > 30 dias.
- `quality_improvements_v` ganha `source='supplier'` para `status IN ('suspended','disqualified')`.

#### Permissões (RLS)
| Ação | Quem |
|---|---|
| Ver suppliers/evaluations/docs/incidents da empresa | `authenticated` da company |
| CRUD suppliers e evaluations | Master OU `owner_user_id` |
| Sobrescrever `status` do supplier | Master |
| Inserir incident | qualquer `authenticated` da company |
| Resolver incident | Master |
| Upload docs | Master OU `owner_user_id` |

### 2. Frontend

#### Hooks novos
- `useQualitySuppliers.ts` — lista, filtros (categoria, status, criticidade, vencidos), CRUD.
- `useQualitySupplierEvaluations.ts` — por supplier; criar/listar com critérios.
- `useQualitySupplierIncidents.ts` — CRUD, vínculo opcional com NCR.

#### Páginas
- `src/pages/quality/Suppliers.tsx` (`/quality/suppliers`) — tabs:
  1. **Lista** (tabela com filtros + badges A/B/C/D + status + dueDate).
  2. **Avaliação vencida** (recorte de `quality_alerts_v`).
  3. **Incidentes abertos**.
- `src/pages/quality/SupplierDetail.tsx` (`/quality/suppliers/:id`) — tabs: **Resumo**, **Avaliações**, **Critérios**, **Documentos**, **Incidentes**.

#### Componentes novos (`src/components/quality/`)
- `SupplierRegisterTable.tsx`
- `SupplierEvaluationDrawer.tsx` — critérios pesados; status sai pronto do trigger.
- `SupplierIncidentDialog.tsx` — combobox de NCRs abertas.
- `SupplierDocumentsList.tsx` — padrão `corp_documents` com `valid_until`.
- `SupplierStatusBadge.tsx` — tokens `success`/`warning`/`destructive`.

#### Edições pontuais
- `src/App.tsx` — rotas lazy `/quality/suppliers` e `/quality/suppliers/:id`.
- `src/components/DashboardLayout.tsx` — item "Provedores Externos" (`Factory` do `lucide-react`) no `qualidadeMenuItems`.
- `src/pages/quality/Dashboard.tsx` — cards "Provedores com reavaliação vencida" e "Provedores suspensos/desqualificados".
- `src/hooks/useQualityAlerts.ts` — counters `supplier_requalification` e `supplier_pending` + labels.
- `src/components/supplies/NewPurchaseRequestDialog.tsx` — Combobox opcional de supplier `status IN ('approved','conditional')`, grava `supplier_id`.

### 3. Fora de escopo (3.6)
- Workflow de aprovação multi-etapa para qualificação inicial.
- Cotação eletrônica / portal do fornecedor.
- Importação CSV ou Omie de fornecedores legados.
- Exportação PDF da lista de aprovados.

---

## Sprint 3.7 — Calibração / Recursos de Monitoramento (§7.1.5)

Objetivo: inventariar instrumentos de medição, registrar certificados de calibração, alertar a próxima calibração e expor instrumentos vencidos como alertas SGQ.

### 0. Storage (pré-requisito da migration)
Criar bucket **privado** `quality-calibrations` via `supabase--storage_create_bucket(name='quality-calibrations', public=false)` antes da migration. Path padrão: `{company_id}/{device_id}/{calibration_id}/{sanitized_filename}`.

Policies em `storage.objects` (na migration):
- SELECT/INSERT/UPDATE/DELETE permitidos para Master OU para `responsible_user_id` do device cujo `id` aparece como segundo segmento do path. Usa subquery em `quality_measuring_devices` por `device_id`.

### 1. Banco de dados (1 migration)

#### Enums
- `quality_device_status`: `active | in_calibration | out_of_service | retired | overdue`.
- `quality_calibration_kind`: `internal | external_lab | manufacturer | self_check`.
- `quality_calibration_result`: `approved | approved_with_restriction | reproved`.

#### Tabelas (todas com `company_id`, RLS, GRANTs)

- **`quality_measuring_devices`** — `code` (TAG/patrimônio), `name`, `description`, `manufacturer`, `model`, `serial_number`, `measurement_range`, `unit`, `resolution`, `accuracy`, `location`, `responsible_user_id`, `status` (default `active`), `criticality`, `calibration_frequency_months` (default 12), `last_calibration_at`, `next_calibration_due`, `acquired_at`, `retired_at`, `notes`. UNIQUE`(company_id, code)`.
- **`quality_calibrations`** — `device_id`, `kind`, `calibration_date`, `result`, `provider_supplier_id` FK opcional `quality_suppliers(id)`, `certificate_number`, `certificate_file_url`, `certificate_file_name`, `cost`, `measurement_uncertainty`, `traceability`, `valid_until`, `restrictions`, `next_due_at`, `performed_by_user_id`, `notes`.
- **`quality_calibration_checkpoints`** — `calibration_id`, `nominal_value`, `measured_value`, `error`, `tolerance`, `pass boolean`.
- **`quality_device_usage_log`** (esqueleto, sem UI) — `device_id`, `service_order_id`, `used_at`, `used_by`.

#### Funções
- `quality_calibration_after_change_trigger()` — AFTER INSERT/UPDATE em `quality_calibrations`:
  - se `result IN ('approved','approved_with_restriction')` → `device.last_calibration_at = calibration_date`, `device.next_calibration_due = COALESCE(valid_until, calibration_date + frequency_months)`, `device.status = 'active'`;
  - se `result = 'reproved'` → `device.status = 'out_of_service'`.
- **`quality_device_status_refresh()`** — `UPDATE quality_measuring_devices SET status='overdue' WHERE status='active' AND next_calibration_due < CURRENT_DATE`. GRANT EXECUTE TO `authenticated`. Chamada on-mount pelo hook (ver Frontend).
- `quality_device_block_usage(p_device_id) RETURNS boolean` — utilitário para futura validação em OS.

#### Triggers
- `BEFORE INSERT` em `quality_measuring_devices`: se `next_calibration_due IS NULL` e `last_calibration_at IS NOT NULL`, calcula `last_calibration_at + calibration_frequency_months`.
- `AFTER INSERT OR UPDATE` em `quality_calibrations`: `quality_calibration_after_change_trigger`.

#### Extensão de views
- `quality_alerts_v`: `source='device'`, `category='calibration'`, `overdue` se `next_calibration_due < hoje`, `due_soon` se ≤ 30d; só para `status IN ('active','in_calibration','overdue')`.
- `quality_improvements_v`: `source='device'` para `status='out_of_service'` e para `result='reproved'` na última calibração.

#### Permissões
| Ação | Quem |
|---|---|
| Ver devices/calibrations/checkpoints da company | `authenticated` da company |
| CRUD devices | Master OU `responsible_user_id` |
| Inserir calibration | Master OU `responsible_user_id` |
| Aposentar device | Master |
| Upload certificado (storage) | Master OU `responsible_user_id` do device |

### 2. Frontend

#### Hooks novos
- `useQualityDevices.ts` — **`useEffect(() => { supabase.rpc('quality_device_status_refresh'); }, [])` antes do `useQuery`** para garantir status atualizado ao abrir a página. Filtros (status, criticidade, vencidos, local, responsável), CRUD.
- `useQualityCalibrations.ts` — por device; criar/listar com checkpoints.

#### Páginas
- `src/pages/quality/Devices.tsx` (`/quality/devices`) — tabs:
  1. **Inventário**.
  2. **Calibrações vencidas** (via `quality_alerts_v`).
  3. **Histórico de certificados**.
- `src/pages/quality/DeviceDetail.tsx` (`/quality/devices/:id`) — tabs: **Resumo**, **Histórico**, **Checkpoints**, **Certificados**.

#### Componentes novos
- `DeviceRegisterTable.tsx`
- `CalibrationDrawer.tsx` — upload no bucket `quality-calibrations`, Combobox de `provider_supplier_id` filtrando `category='calibration' AND status IN ('approved','conditional')`.
- `CalibrationCheckpointsEditor.tsx`
- `DeviceStatusBadge.tsx`
- `CertificateViewerDialog.tsx` — reaproveita `PDFCanvasViewer`.

#### Edições pontuais
- `src/App.tsx` — rotas lazy `/quality/devices` e `/quality/devices/:id`.
- `src/components/DashboardLayout.tsx` — item "Calibração" (`Gauge` do `lucide-react`).
- `src/pages/quality/Dashboard.tsx` — cards "Calibrações vencidas" e "Instrumentos fora de serviço".
- `src/hooks/useQualityAlerts.ts` — counter `device_calibration` + label.

### 3. Fora de escopo (3.7)
- Bloqueio rígido na criação de OS para device vencido (função `quality_device_block_usage` fica disponível).
- Reserva/agendamento de instrumentos.
- Importação CSV.
- App mobile dedicado para conferência em campo.
- Integração com laboratórios externos (API).
- Cron de verdade para refresh (próxima sprint, com edge function `pg_cron`).

---

## Ordem de execução combinada

1. **3.6**: migration → hooks → componentes → `Suppliers.tsx` → `SupplierDetail.tsx` → edições pontuais (App, Layout, Dashboard, Alerts, NewPurchaseRequestDialog).
2. **3.7**: criar bucket `quality-calibrations` → migration (policies storage + tabelas + FK para `quality_suppliers`) → hooks (com refresh on-mount) → componentes → `Devices.tsx` → `DeviceDetail.tsx` → edições pontuais.

3.7 depende de 3.6 por causa do FK opcional `provider_supplier_id`. Caso o usuário queira inverter, basta adiar esse FK para uma migration posterior.

## Notas técnicas comuns

- Sem novas edge functions nesta sprint.
- Tokens `success`/`warning` já existem (3.4).
- Tipos do Supabase serão regerados após cada migration; uso provisório de `as any`.
- Padrão Combobox para listas longas (`large-table-fetching-strategy`).
- Sanitização de filename já documentada (`filename-sanitization-storage-requirement`).

## Pergunta antes do build

Confirmar: entregar 3.6 e 3.7 em **dois build modes separados** (recomendado, dois ciclos de aprovação) ou tudo num único build?
