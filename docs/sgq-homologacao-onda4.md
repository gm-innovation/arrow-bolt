# Homologação SGQ — Onda 4 / 5

> **Status:** rascunho para validação da gestora.
> **Regra:** nenhuma migração ou tela nova das Ondas 4A / 4B / 5 deve ser criada antes da aprovação deste documento.
> **Princípio fundador:** não duplicar versionamento documental quando o GED (`quality_documents`) já resolve. Mesma lógica adotada em Processo ↔ Documento (Opção B).

Legenda de status:
- 🔴 **Inexistente** — não há schema nem UI.
- 🟡 **Parcial** — schema/UI existem mas com lacunas.
- 🟢 **Existente, não homologado** — schema/UI existem; faltam regras, fluxo ou validação funcional.

---

## 1. Referência Normativa 🟢

| Campo | Detalhe |
|---|---|
| **Requisito do DOCX** | Cadastro de normas aplicáveis ao SGQ com anexo, revisão, expiração, código e controle documental igual ao GED. |
| **Estado atual** | Tabela e UI mínima existem; sem versionamento controlado, sem anexo, sem alerta de expiração. |
| **Tabelas / hooks / telas** | `quality_reference_norms` · `useQualityReferenceNorms` (em `useQualityIsoStructure.ts`) · aba "Normas de Referência" em `IsoStructure.tsx`. |
| **Gap de regra** | Sem `revision`, `status` (vigente/substituída/cancelada), `superseded_by_id`, `responsible_user_id`. Sem alerta 30/60/90 dias. Sem ciclo de revisão. |
| **Gap de UI** | Sem página dedicada (`/quality/iso/norms`). Sem filtros (vigente / vencendo / vencida). Sem upload de anexo. Sem visualização de histórico. |
| **Gap de permissão** | Hoje qualidade/super_admin escrevem. Aceitável. Avaliar se norma vencida exige aprovação central do Master. |
| **Gap de integração** | **Decisão pendente:** anexo vai para storage próprio (bucket `quality-norms`) ou para `quality_documents`? Se for documento controlado formal → vínculo via `document_id` (já existe coluna nullable) e versionamento herdado do GED. |
| **Decisão** | **Adaptar** + **decisão prévia** sobre arquitetura documental. |
| **Prioridade** | Alta. |
| **Recomendação de sprint** | Onda 4A. |

**Decisão arquitetural a fechar:** versionamento próprio na tabela (campos `revision` + `superseded_by_id`) ou via vínculo obrigatório com `quality_documents`. Recomendação técnica: norma como entidade de negócio leve + documento formal opcional no GED.

---

## 2. Termos e Definições 🟢

| Campo | Detalhe |
|---|---|
| **Requisito do DOCX** | Glossário controlado com versionamento, responsável, revisão, status, busca simples. |
| **Estado atual** | Cadastro CRUD básico; sem versionamento, sem ciclo, sem status. |
| **Tabelas / hooks / telas** | `quality_terms` (FK para `quality_reference_norms`) · `useQualityTerms` · aba "Termos e Definições" em `IsoStructure.tsx`. |
| **Gap de regra** | Sem `version`, `status` (rascunho/vigente/obsoleto), `responsible_user_id`, `last_reviewed_at`, `next_review_due_at`, `review_frequency_months`. |
| **Gap de UI** | Sem busca textual real (apenas listagem). Sem filtro por norma. Sem indicador de status. |
| **Gap de permissão** | Aceitável (qualidade/super_admin). |
| **Gap de integração** | Mesma decisão da norma: se termo for conteúdo simples, versiona na própria tabela; se for documento formal (ex.: glossário oficial publicado), vincula a `quality_documents`. |
| **Decisão** | **Adaptar** + decisão prévia análoga à de Referência Normativa. |
| **Prioridade** | Média. |
| **Recomendação de sprint** | Onda 4A. |

---

## 3. Partes Interessadas com evidências 🟡

| Campo | Detalhe |
|---|---|
| **Requisito do DOCX** | Cadastro com evidências anexadas, controle/revisão periódica, responsável, status da tratativa. |
| **Estado atual** | Schema completo (parte + evidências); UI lista partes mas não expõe evidências nem status de tratativa. |
| **Tabelas / hooks / telas** | `quality_interested_parties` (já tem `owner_user_id`, `review_frequency_months`, `next_review_due_at`) · `quality_interested_party_evidences` (já tem `document_id` opcional, `evidence_date`, `valid_until`) · `useQualityInterestedParties` · página `InterestedParties.tsx` (aba em `RisksHub.tsx`). |
| **Gap de regra** | Falta `treatment_status` (pendente/em_andamento/atendida/não_aplicável). Trigger `quality_recalc_next_review` já existe — basta usar. |
| **Gap de UI** | Drawer por parte com upload de evidências, listagem com expiração e badge de status. Alerta "revisões em atraso" no Dashboard reaproveitando `next_review_due_at`. |
| **Gap de permissão** | Aceitável (qualidade/director/super_admin). |
| **Gap de integração** | Evidência pode opcionalmente apontar para `quality_documents` (já há FK). Manter caminho duplo: arquivo solto (`external_file_path`) **ou** documento controlado. |
| **Decisão** | **Adaptar** (UI + 1 coluna). |
| **Prioridade** | Alta. |
| **Recomendação de sprint** | Onda 4A. |

---

## 4. Planejamento 🔴

| Campo | Detalhe |
|---|---|
| **Requisito do DOCX** | Objetivos da qualidade, indicadores, mudanças planejadas, ações derivadas de análise, vínculo com riscos. |
| **Estado atual** | Não existe schema dedicado. Indicadores hoje são apenas views derivadas (`quality_kpi_recurrence_v`, `quality_kpi_timeseries_v`, `quality_kpi_snapshot_v`). |
| **Tabelas / hooks / telas** | Nenhuma específica. Reaproveitar `quality_action_plans`, `quality_risk_actions`, `quality_management_review_outputs`, `quality_settings` (Política). |
| **Gap de regra** | Tudo: objetivos, vínculo com Política, metas, períodos, medições, mudanças planejadas, aprovação central para objetivos e mudanças. |
| **Gap de UI** | Tudo. Entrar como **submódulo dentro de Riscos & Oportunidades** (rota interna `/quality/risks/planning`), sem novo item raiz na sidebar. |
| **Gap de permissão** | Aprovação central obrigatória para `objective` e `planned_change` — adicionar ao `approval_scope`. |
| **Gap de integração** | Adicionar colunas opcionais `objective_id` em `quality_action_plans` e `quality_risk_actions`; `generates_action_plan_id` em `quality_management_review_outputs` para fechar o ciclo análise → ação → objetivo. |
| **Decisão** | **Criar** (3 tabelas novas + 3 colunas opcionais). |
| **Prioridade** | Alta. |
| **Recomendação de sprint** | Onda 4B. |

> **Alerta anti-BSC:** objetivos aqui não significam BSC. São objetivos operacionais do SGQ vinculados à Política, sem perspectivas financeira/cliente/processo/aprendizado.

---

## 5. Recursos / RH 🟡

| Campo | Detalhe |
|---|---|
| **Requisito do DOCX** | Cargos, competências por cargo, treinamentos obrigatórios, acesso do RH, visão de documentos por colaborador. |
| **Estado atual** | Cargos/competências/treinamentos existem no SGQ; cadastro de colaborador vive no módulo RH. Sem view unificada. |
| **Tabelas / hooks / telas** | `quality_competencies`, `quality_competency_mappings`, `quality_role_requirements`, `quality_user_competencies`, `quality_training_plans`, `quality_document_required_courses`. RH: `profiles`, `departments`, `technicians`. |
| **Gap de regra** | Nenhuma estrutural nova. Falta definir fonte de verdade (cargo vem de RH ou SGQ?). |
| **Gap de UI** | Visão consolidada "recursos por cargo" cruzando RH + Qualidade. |
| **Gap de permissão** | Papel `qualidade` precisa de SELECT em `profiles`/`departments` para visão consultiva. Confirmar com memória `profiles-pii-protection`: usar `profiles_public` ou RPC, não acesso direto a `profiles`. |
| **Gap de integração** | View `quality_resources_v` unindo `quality_role_requirements` + `quality_competency_mappings` + dados públicos de `profiles_public`. |
| **Decisão** | **Reaproveitar** + criar view de leitura. |
| **Prioridade** | Média. |
| **Recomendação de sprint** | Onda 5 (após decisão de dono de negócio). |

**Decisão de negócio pendente:** Qualidade só consulta ou pode editar cargos/competências?

---

## 6. Documentos dos colaboradores 🟡

| Campo | Detalhe |
|---|---|
| **Requisito do DOCX** | Documentos por colaborador, validade, ciência, onboarding/dossiê, integração com treinamento obrigatório. |
| **Estado atual** | Existe no RH (`technician_documents`, `onboarding_documents`, `employee_notes`). Qualidade não tem visão consultiva. |
| **Tabelas / hooks / telas** | `technician_documents` (com bucket por `{company_id}/{technician_id}/{document_type}/...`), `onboarding_documents`, `onboarding_document_types`. Memórias relevantes: `doc-path-structure`, `editable-document-metadata`. |
| **Gap de regra** | Nada novo; reaproveitar validade e expiração já existentes. |
| **Gap de UI** | Aba/visão somente leitura no SGQ. |
| **Gap de permissão** | Permissão cruzada: papel `qualidade` consulta; RH continua dono (escrita). |
| **Gap de integração** | Vínculo com `quality_document_required_courses` para mostrar "documentos pendentes de ciência". |
| **Decisão** | **Reaproveitar** — view de leitura, sem duplicar storage. |
| **Prioridade** | Média. |
| **Recomendação de sprint** | Onda 5. |

---

## 7. Calibração 🟢

| Campo | Detalhe |
|---|---|
| **Requisito do DOCX** | Laboratório, instrumento, certificado, responsável, vencimento, histórico, alertas. |
| **Estado atual** | Schema completo; UI existe; falta homologação funcional e alertas integrados. |
| **Tabelas / hooks / telas** | `quality_measuring_devices` (25 colunas), `quality_calibrations` (21 colunas), `quality_calibration_checkpoints`, `quality_device_usage_log` · `useQualityDevices` · `Devices.tsx`, `DeviceDetail.tsx`. |
| **Gap de regra** | Certificado anexo obrigatório no fechamento de calibração (validação no formulário e/ou check constraint). Política de bloqueio de uso para dispositivo vencido. |
| **Gap de UI** | Alertas de vencimento no Dashboard de Qualidade. Card de "calibrações vencendo nos próximos 30 dias". Indicador visual de dispositivo vencido bloqueado. |
| **Gap de permissão** | Aceitável. |
| **Gap de integração** | Vínculo com Lista Mestre (instrumento controlado entra na lista). |
| **Decisão** | **Adaptar** (regras + alertas, sem schema novo). |
| **Prioridade** | Média (sobe se houver auditoria externa próxima). |
| **Recomendação de sprint** | Onda 5. |

---

## 8. Satisfação do Cliente 🟢

| Campo | Detalhe |
|---|---|
| **Requisito do DOCX** | Lista mestra de pesquisas, link para envio ao cliente, resposta registrada, abertura de atuação, consolidação por período. |
| **Estado atual** | Schema completo; UI parcial. Sem workflow "abrir tratativa" amarrado a melhoria/NC. Sem painel consolidado. |
| **Tabelas / hooks / telas** | `quality_satisfaction_campaigns`, `quality_satisfaction_invites`, `quality_satisfaction_responses` · `useSatisfactionCampaigns` · `VoiceOfCustomer.tsx`, `SatisfactionDetail.tsx`, página pública `SatisfactionResponse.tsx`. |
| **Gap de regra** | Workflow: resposta crítica → botão "abrir tratativa" → gera registro em `quality_improvements_manual` (com `origin_type = satisfaction`, ver item 10) ou em `quality_ncrs`. |
| **Gap de UI** | Painel consolidado por período (NPS / CSAT), Lista Mestra de campanhas, filtro por cliente e por nota. |
| **Gap de permissão** | Aceitável. |
| **Gap de integração** | Integra com item 10 (Melhorias) via `origin_id` polimórfico. |
| **Decisão** | **Adaptar** (workflow + painel, sem schema novo). |
| **Prioridade** | Média. |
| **Recomendação de sprint** | Onda 5. |

---

## 9. Saúde e Segurança 🟡

| Campo | Detalhe |
|---|---|
| **Requisito do DOCX** | Aba própria com acesso de Qualidade e Gestão de Pessoas. Tipos: PCMSO, PGR, LTCAT, NR01, Ficha de EPI. Comporta-se como GED especializado. |
| **Estado atual** | Hook existe (`useQualitySafetyDocuments`) e página `Safety.tsx` existe. **Schema atual não confirmado nesta homologação** — precisa inspecionar. EPI tem módulo próprio em RH (`epi_items`, `epi_deliveries`, `epi_stock_movements`). |
| **Tabelas / hooks / telas** | `useQualitySafetyDocuments` · `Safety.tsx` · RH: `epi_items`, `epi_deliveries`, `epi_stock_movements`. |
| **Gap de regra** | A definir após homologação do schema atual. |
| **Gap de UI** | Tipos pré-cadastrados (PCMSO, PGR, LTCAT, NR01). Alertas de expiração. |
| **Gap de permissão** | Permissão cruzada Qualidade ↔ RH (ambos leem; quem escreve depende da decisão de dono). |
| **Gap de integração** | Ficha de EPI já existe em RH — Qualidade consulta, não duplica. |
| **Decisão** | **Decidir escopo de negócio antes** (dono, fonte de verdade, escrita). Depois reaproveitar ou adaptar. |
| **Prioridade** | Média (alta se houver auditoria de SST próxima). |
| **Recomendação de sprint** | Onda 5 — **bloqueada até decisão de negócio**. |

**Decisões pendentes:**
1. Módulo vive em Qualidade, RH ou ambos?
2. O que é documento de colaborador (RH) vs documento legal/empresa (Qualidade)?
3. Ficha de EPI é individual (RH) ou documento controlado geral (Qualidade)?

---

## 10. Consolidação de Melhorias 🟢

| Campo | Detalhe |
|---|---|
| **Requisito do DOCX** | Origem, ação, responsável, prazo, status, eficácia, vínculo com NC, auditoria, satisfação, risco ou desvio. |
| **Estado atual** | Tabela existe; falta origem polimórfica, eficácia e visão consolidada. |
| **Tabelas / hooks / telas** | `quality_improvements_manual` (já tem `action_plan_id`, `responsible_id`, `due_date`, `status`, `priority`) · `useQualityImprovements` · `Improvements.tsx`. |
| **Gap de regra** | Adicionar `origin_type` (manual / ncr / audit / satisfaction / risk / deviation / critical_review), `origin_id` (uuid polimórfico, sem FK física), `effectiveness_status` (pendente / eficaz / ineficaz), `effectiveness_verified_at`, `effectiveness_notes`, `effectiveness_verified_by`. |
| **Gap de UI** | Botão "Criar melhoria a partir de..." nas telas de NC, auditoria, desvio e satisfação (pré-preenche `origin_type` + `origin_id`). Página consolidada com filtros por origem. Métricas no Dashboard: melhorias por origem, % verificadas, % eficazes. |
| **Gap de permissão** | Aceitável. |
| **Gap de integração** | Integra com itens 1–9 via origem polimórfica. |
| **Decisão** | **Adaptar** (1 migração + UI). |
| **Prioridade** | Alta. |
| **Recomendação de sprint** | Onda 4A. |

---

## Resumo executivo

| # | Tema | Status | Decisão | Sprint |
|---|---|---|---|---|
| 1 | Referência Normativa | 🟢 | Adaptar + decisão GED | 4A |
| 2 | Termos e Definições | 🟢 | Adaptar + decisão GED | 4A |
| 3 | Partes Interessadas (evidências) | 🟡 | Adaptar | 4A |
| 4 | Planejamento | 🔴 | Criar | 4B |
| 5 | Recursos / RH | 🟡 | Reaproveitar + view | 5 |
| 6 | Documentos dos colaboradores | 🟡 | Reaproveitar | 5 |
| 7 | Calibração | 🟢 | Adaptar | 5 |
| 8 | Satisfação do Cliente | 🟢 | Adaptar | 5 |
| 9 | Saúde e Segurança | 🟡 | Decidir antes | 5 (bloqueado) |
| 10 | Melhorias consolidadas | 🟢 | Adaptar | 4A |

## Decisões transversais a fechar antes da Onda 4A

1. **GED para Norma/Termo:** versionamento próprio na entidade ou via vínculo com `quality_documents`?
2. **Aprovação central:** adicionar `objective`, `planned_change`, `norm_publication` ao `approval_scope`?
3. **Polimorfismo de origem em Melhoria:** aceitável usar `origin_type` + `origin_id` sem FK física, validando por trigger? (Padrão adotado em outros módulos do projeto.)

## Decisões de negócio a fechar antes da Onda 5

1. **Recursos/RH:** Qualidade só consulta ou pode editar cargos/competências?
2. **Documentos do colaborador:** view de leitura no SGQ — quais campos PII? (memória `profiles-pii-protection` aplica-se).
3. **Saúde e Segurança:** dono, escopo, separação documento de colaborador vs documento legal, escopo da Ficha de EPI.

---

**Próximo passo:** validação deste documento pela gestora. Após aprovação, abrir **Onda 4A** (itens 1, 2, 3, 10 + refino #5) em conjunto com refinos **R1** (UI do `approval_scope`) e **R3** (regra processo vigente + histórico de `current_document_id`).
