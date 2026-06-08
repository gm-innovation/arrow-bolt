# Plano final — Conformidade ISO (DOCX)

Travas fechadas: (1) escopo da aprovação central restrito na Onda 1, (2) `quality_processes` aponta para `quality_documents` (Opção B).

---

## Decisões fechadas

- **Master** = flag por empresa: `quality_settings.quality_master_user_id` (uuid). Roles existentes controlam acesso; só o user designado aprova.
- **Documentos da empresa**: `quality_company_documents` (CNPJ, Alvará, IE…), sem `client_id`.
- **Processo ↔ Documento (Opção B)**: `quality_processes` é o cadastro organizacional; a parte controlada (revisão, validade, aprovação, layout) vive em `quality_documents` vinculado via `current_document_id`.
- **Lista Mestre**: consolida `quality_documents` + `quality_processes` (via documento atual) + responsáveis.
- **Sidebar**: 10 itens atuais. Sem novos hubs.
- **Sem** assinatura digital do master em exports.

### Escopo da aprovação central (Onda 1, obrigatório)
- Publicação/revisão de **documentos do SGQ** (`quality_documents`)
- **Documentos da empresa** (`quality_company_documents`) — publicação e renovação
- Publicação de **processos** (efetivamente: o documento controlado vinculado ao processo)
- Publicação da **Política da Qualidade** (Onda 2)
- **Snapshot oficial do Contexto** (`quality_context_versions` com flag `is_official=true`)

### Aprovação central configurável / Onda 2+ (não bloqueia operação)
- Fechamento de NCR
- Registro de Desvio
- Outros registros transacionais
- Flag `require_master_approval` por tipo de entidade em `quality_settings.approval_scope jsonb` (master ativa/desativa).

### Agrupamento final de abas
- **Documentos** → Documentos | Cópias Controladas | Lista Mestre | Documentos da Empresa
- **Não-Conformidades** → NCs | Melhorias | Planos de Ação | Desvios
- **Auditorias** → Auditorias | Calendário | Anexos
- **Riscos & Oportunidades** → Riscos | Partes Interessadas | Contexto | Processos | SWOT/Cenário
- **Competências & Treinamentos** → Matriz | Meu Desenvolvimento | Treinamentos | Estrutura/Responsabilidades
- **Análise Crítica** → módulo próprio (card de vínculo ao Contexto)
- **Configurações** → Parâmetros SGQ | Layout global | Aprovação central / workflow | TI & Backup | Política da Qualidade
- **Dashboard de Qualidade** → banner persistente de ciência da Política

---

## Onda 1 — Governança e aderência estrutural

### 1. Aprovação central pelo Master (escopo restrito)
- `quality_settings.quality_master_user_id uuid` + `quality_settings.approval_scope jsonb` (default: documentos, company_documents, processos, política, contexto_oficial = true; ncr, desvio = false).
- `quality_central_approvals` (entity_type, entity_id, requested_by, requested_at, approved_by, approved_at, status, notes).
- Hook `useCentralApproval(entity_type, entity_id)` consulta `approval_scope` antes de exigir aprovação.
- Bandeja em **Configurações → Aprovação central / workflow** (visível só ao master).
- RLS: `approved_by` só setado por `auth.uid() = quality_master_user_id` da empresa.
- Trigger reflete `approved` na entidade origem; estado `pending_master_approval` nas entidades sob escopo.

### 2. Mapeamento de Processos / SIPOC — Opção B
- `quality_processes` (name, owner_user_id, type, description, status, **current_document_id** uuid FK → `quality_documents.id`).
- `quality_process_sipoc` (process_id, suppliers, inputs, activities, outputs, customers).
- `quality_process_activities` (process_id, order_index, activity, responsible_user_id, indicators).
- Aba "Processos" em **Riscos & Oportunidades** com lista + drawer SIPOC + atividades + card "Documento controlado" (versão, revisão, próximo review, status de aprovação).
- Publicar/revisar o processo = publicar/revisar o documento vinculado (passa pelo master).
- `process_id` opcional em `quality_risks` e `quality_ncrs`.

### 3. Análise Crítica vinculada ao Contexto
- `quality_org_context.last_management_review_id uuid` (FK opcional).
- Card "Última Análise Crítica" em `OrgContext.tsx`.
- Snapshot de revisão grava `management_review_id` quando originado de reunião.

### 4. Documentos da Empresa com expiração
- `quality_company_documents` (company_id, document_type, title, file_url, issued_at, expires_at, status, owner_user_id, notes).
- Aba "Documentos da Empresa" em **Documentos**.
- Alertas T-30/T-7/vencido via `quality_alert_history`.
- Publicação e renovação passam por aprovação central.

### 5. Auditorias — periodicidade mensal + anexos
- `quality_audits.recurrence` (monthly|quarterly|semiannual|annual|ad_hoc) + `next_due_at`.
- `quality_audit_attachments` (audit_id, file_name, file_url, kind: plan|evidence|report|photo, uploaded_by).
- Aba "Calendário" em **Auditorias** com ciclo mensal + alertas.
- Drawer ganha aba "Anexos".

---

## Onda 2 — Consolidação e refinamento operacional

### 6. Lista Mestre (escopo restrito)
- Aba em **Documentos** consolidando `quality_documents` + `quality_processes` (via `current_document_id`) + responsáveis.
- Colunas: código, título, tipo (Documento/Processo), versão vigente, dono, responsável pelo processo (quando aplicável), última revisão, próxima revisão, status, status de aprovação.
- Versão e validade do processo vêm sempre do documento vinculado — sem duplicar versionamento.
- Filtros por tipo/status; export CSV/PDF simples.

### 7. Layout padronizado do portal
- `quality_settings.document_layout jsonb` (header, footer, logo, cor primária, carimbo de aprovação, marca-d'água "CÓPIA NÃO CONTROLADA").
- Aba "Layout global" em **Configurações** com editor + preview.
- `QualityDocumentPDF.tsx` lê layout global e aplica em todos os PDFs.

### 8. Campo de Desvios
- `quality_deviations` (origin_type: document|process|product, origin_ref_id, description, justification, approved_by, approved_at, expires_at, status).
- CTA "Registrar Desvio" em `DocumentDetail.tsx`, Processos e NCRs.
- Aba "Desvios" em **Não-Conformidades**.
- Aprovação central **configurável** via `approval_scope` (default off; master pode ligar).

### 9. Política da Qualidade / Conscientização
- `quality_settings.quality_policy_text` + `quality_policy_version`.
- `quality_policy_acknowledgements` (user_id, policy_version, acknowledged_at).
- Edição/publicação em **Configurações → Política da Qualidade** (passa pelo master; nova versão zera ciência).
- Ciência via banner persistente no **Dashboard de Qualidade**, com botão "Li e estou ciente".
- Indicadores de adesão (% por departamento) na própria página.

### 10. TI & Backup em Configurações
- `quality_it_safeguards` (kind: backup|antivirus, performed_at, performed_by, target, result: ok|fail, evidence_url, notes).
- Aba "TI & Backup" em **Configurações** com calendário e registro mensal obrigatório.
- Alerta quando passa o período definido em `quality_settings.review_cycles` sem registro.

### 11. Cálculo automático do cenário SWOT
- Função em `useQualityOrgContext` classifica em Ofensivo / Defensivo / Reorientação / Sobrevivência.
- Aba "SWOT / Cenário" em **Riscos & Oportunidades** com card "Cenário Estratégico Atual".
- Snapshot grava `scenario` em `quality_context_versions`.

---

## Onda 3 — Maturidade organizacional

### 12. Liderança / Organograma
- `quality_org_chart_nodes` (parent_id, user_id, position_title, responsibilities, authorities, order_index).
- Aba "Estrutura/Responsabilidades" em **Competências & Treinamentos**.
- Export PDF usando layout global.

---

## Fora de escopo
- BSC / Objetivos Estratégicos
- Boolean "considera mudanças climáticas"
- Assinatura digital do master em exports
- Aba de Política em Competências & Treinamentos
- Aprovação central de NCRs/Desvios como obrigatória (fica configurável)

---

## Detalhes técnicos

**Migrations (uma por onda):**
1. **Onda 1** — tabelas: `quality_central_approvals`, `quality_processes` (já com `current_document_id`), `quality_process_sipoc`, `quality_process_activities`, `quality_company_documents`, `quality_audit_attachments`. Colunas: `quality_settings.quality_master_user_id`, `quality_settings.approval_scope`, `quality_org_context.last_management_review_id`, `quality_audits.recurrence` + `next_due_at`, `quality_context_versions.is_official`. GRANTs + RLS por `company_id`.
2. **Onda 2** — tabelas: `quality_deviations`, `quality_policy_acknowledgements`, `quality_it_safeguards`. Colunas: `quality_settings.document_layout`, `quality_policy_text`, `quality_policy_version`; `quality_context_versions.scenario`.
3. **Onda 3** — `quality_org_chart_nodes`.

**Hooks novos:** `useCentralApproval`, `useQualityProcesses`, `useQualityCompanyDocuments`, `useQualityMasterList`, `useQualityDeviations`, `useQualityPolicy`, `useQualityITSafeguards`, `useQualityOrgChart`.

**Verificações finais:**
- **O1**: Documento publicado sem master fica `pending_master_approval`; bandeja só ao master; Processo publicado = documento vinculado publicado; Contexto mostra última Análise Crítica; Documento da Empresa vencido alerta; Auditoria mensal pendente alerta; NCR/Desvio **não** exigem master por default.
- **O2**: Lista Mestre puxa versão/validade do documento (mesmo para processos); layout reflete em todos os PDFs; cenário SWOT recalcula ao salvar item; política nova zera ciência; TI & Backup alerta mensal.
- **O3**: Organograma exporta com layout global.