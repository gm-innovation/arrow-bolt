# Plano — Onda 4 e 5: aderência ampla ao DOCX + refinos (v2)

**Decisão fundadora (não negociável):** começar **obrigatoriamente** pela Etapa 0 de homologação. Nenhuma migração ou tela nova antes da validação do documento `docs/sgq-homologacao-onda4.md`. A Onda 4A só será detalhada tecnicamente depois.

Justificativa: já existem ~15 tabelas relacionadas (`quality_reference_norms`, `quality_terms`, `quality_interested_parties` + evidências, `quality_improvements_manual`, `quality_measuring_devices`/`calibrations`/`checkpoints`, `quality_satisfaction_*`, `quality_safety_documents`, etc.). Pular homologação = duplicar tela, criar schema paralelo, quebrar regra existente, queimar crédito com retrabalho.

---

## Etapa 0 — Homologação (obrigatória, sem código)

**Saída executável:** `docs/sgq-homologacao-onda4.md`, uma ficha padronizada por tema com este formato:

| Campo | Descrição |
|---|---|
| Requisito do DOCX | O que a gestora pediu |
| Estado atual no sistema | O que já existe |
| Tabelas / hooks / telas existentes | Nome exato |
| Gap de regra | O que falta de lógica |
| Gap de UI | O que falta de tela/fluxo |
| Gap de permissão | O que falta em RLS/roles |
| Gap de integração | RH, cliente, storage, etc. |
| Decisão | reaproveitar / adaptar / criar |
| Prioridade | alta / média / baixa |
| Recomendação de sprint | 4A / 4B / 5 / refino |

**Temas (10):** Referência Normativa · Termos e Definições · Partes Interessadas · Planejamento · Recursos/RH · Documentos dos colaboradores · Calibração · Satisfação do Cliente · Saúde e Segurança · Melhorias.

**Decisões específicas que a Etapa 0 precisa fechar:**
- **Referência Normativa e Termos:** versionamento fica na própria entidade ou via vínculo com `quality_documents`? Princípio: não duplicar versionamento documental quando o GED já resolve. Mesma lógica adotada em Processo ↔ Documento.
- **Saúde e Segurança:** módulo vive em Qualidade, RH, ou ambos? O que é documento de colaborador vs documento legal? Ficha de EPI é individual ou documento controlado geral?
- **Recursos/RH:** o que vem do módulo RH atual, o que Qualidade só consulta, o que precisa ser criado.

Validação com a gestora **antes** de qualquer migração da Onda 4A.

---

## Refinos prioritários (entram antes ou em paralelo à Onda 4A)

| # | Refino | Por quê é urgente |
|---|---|---|
| **R1** | Tela de configuração visual do `approval_scope` em Configurações (hoje só JSON) | Reduz erro operacional do Master |
| **R3** | Regra: processo só fica `vigente` se `current_document_id` aponta para documento publicado e não vencido. Alerta quando documento vencer. Tabela `quality_process_document_history` para histórico de troca | Protege Lista Mestre e a lógica Processo ↔ Documento (Opção B) |

Demais refinos, em ordem: R2 (trilha/SLA/delegação do Master) → R4 (Lista Mestre filtros/XLSX) → R5 (Política: diff de versões, ciência por departamento, visualização pública opcional).

---

## Onda 4A — Aderência ISO documental

**Pré-condição:** Etapa 0 validada para os 5 temas abaixo.

### 1. Referência Normativa
- **Antes de migração:** decidir na Etapa 0 se versiona na própria tabela ou via `quality_documents`.
- Campos prováveis a estender (sujeito à decisão acima): `revision`, `status` (vigente/substituída/cancelada), `responsible_user_id`, `superseded_by_id`, anexo (storage ou doc_id).
- Página dedicada com filtros (vigente / vencendo / vencida), alertas 30/60/90 dias via `quality_alert_history`.

### 2. Termos e Definições
- **Mesma homologação prévia:** versionamento próprio ou via `quality_documents`.
- Se ficar próprio: `version`, `status` (rascunho/vigente/obsoleto), `responsible_user_id`, ciclo de revisão.
- Página com busca textual e filtro por norma.

### 3. Partes Interessadas com evidências
- `quality_interested_party_evidences` já existe; falta UI: drawer por parte com upload, expiração, vínculo opcional a `quality_documents`.
- Coluna nova `treatment_status` (pendente/em_andamento/atendida/não_aplicável).
- Reaproveitar trigger `quality_recalc_next_review` já existente; expor `next_review_due_at` na listagem.

### 4. Consolidação funcional de Melhorias
- Estender `quality_improvements_manual` com `origin_type` (manual/ncr/audit/satisfaction/risk/deviation/critical_review) + `origin_id` polimórfico, `effectiveness_status` (pendente/eficaz/ineficaz), `effectiveness_verified_at`, `effectiveness_notes`.
- Botão "Criar melhoria a partir de..." nas telas de NC, auditoria, desvio, resposta de satisfação (pré-preenche origin).
- Página `/quality/improvements` com visão consolidada (origem · ação · responsável · prazo · status · eficácia) e métricas no Dashboard.

### 5. Refinamentos de Contexto / Partes Interessadas
- Painel "Revisões em atraso" no Dashboard reaproveitando `next_review_due_at`.
- Destacar visualmente qual snapshot está marcado como `is_official`.

---

## Onda 4B — Planejamento e Gestão

**Restrição de arquitetura:** **não criar novo item na sidebar.** O conjunto continua em 10 itens. Planejamento entra como **submódulo dentro de Riscos & Oportunidades**, podendo usar rotas internas (`/quality/risks/planning`) mas acessado como subaba/submódulo, não como item raiz.

**Alerta anti-BSC:** Objetivos da Qualidade aqui **não significam implantação de BSC**. São objetivos operacionais do SGQ vinculados à política, com metas, indicadores e planos de ação. Sem perspectivas financeira / cliente / processo / aprendizado.

### 6. Objetivos da Qualidade
Nova tabela `quality_objectives`: `code`, `title`, `description`, `policy_id` (vínculo opcional com Política), `target_value`, `unit`, `period` (anual/semestral/trimestral), `start_date`, `end_date`, `responsible_user_id`, `status` (rascunho/vigente/atingido/não_atingido/cancelado). Aprovação central obrigatória (acrescentar `objective` ao `approval_scope`).

### 7. Indicadores ligados a objetivos
Nova tabela `quality_objective_measurements`: `objective_id`, `period_label`, `measured_value`, `measured_at`, `notes`, `evidence_url`. View consolidada real vs meta, % atingimento (padrão das views `quality_kpi_*`).

### 8. Mudanças Planejadas
Nova tabela `quality_planned_changes`: `title`, `description`, `change_type` (processo/documento/estrutura/sistema), `justification`, `impact_analysis`, `required_resources`, `responsible_user_id`, `planned_date`, `status` (proposta/aprovada/implementada/cancelada), `approved_by`, `effectiveness_review`. Aprovação central obrigatória.

### 9. Vínculos cruzados (fechamento do ciclo)
- `quality_action_plans.objective_id` (opcional)
- `quality_risk_actions.objective_id` (opcional)
- `quality_management_review_outputs.generates_action_plan_id` — fecha o ciclo análise crítica → ação → objetivo.

### 10. Navegação
Em **Riscos & Oportunidades**, as abas passam a ser: Riscos · Partes Interessadas · Contexto · Processos · SWOT/Cenário · **Planejamento** (submódulo com sub-abas internas: Objetivos & Indicadores · Mudanças Planejadas · Ações consolidadas).

---

## Onda 5 — Integrações e Operação (NÃO é build pré-aprovada)

> **Onda 5 só vira plano técnico após a Etapa 0 e validação de donos de negócio.** Nada de migração ou rota nova nesta onda sem que as decisões abaixo estejam fechadas por escrito.

Decisões obrigatórias antes de qualquer implementação:

**11. Recursos / RH** — cargos e competências vêm do módulo RH ou viram entidade SGQ? Provável caminho: SGQ consulta `profiles`/`departments` e mantém só `quality_role_requirements` + `quality_competency_mappings` (já existem) via view `quality_resources_v`.

**12. Documentos dos colaboradores** — reaproveitar `technician_documents` + `onboarding_documents` por view de leitura, sem duplicar storage. Permissão cruzada: papel `qualidade` consulta; RH é dono.

**13. Calibração** — homologar telas existentes (`Devices.tsx`, `DeviceDetail.tsx`) e tabelas (`quality_measuring_devices`, `quality_calibrations`, `quality_calibration_checkpoints`, `quality_device_usage_log`). Falta: alertas de vencimento no Dashboard, certificado obrigatório no fechamento.

**14. Satisfação do Cliente** — homologar `quality_satisfaction_campaigns/invites/responses`. Falta: painel consolidado NPS/CSAT, workflow "abrir tratativa" gerando melhoria/NC, Lista Mestra de pesquisas.

**15. Saúde e Segurança** — decidir escopo (Qualidade, RH, ambos), tipos pré-cadastrados (PCMSO, PGR, LTCAT, NR01, Ficha EPI), permissões cruzadas. Reaproveitar `quality_safety_documents` (hook existe) — homologar schema atual antes de estender.

---

## Ordem final recomendada

1. **Etapa 0** — obrigatória, sem código.
2. **Refinos R1 + R3** — em paralelo ou logo após Etapa 0.
3. **Onda 4A** — itens 1 a 5.
4. **Onda 4B** — itens 6 a 10, submódulo dentro de Riscos & Oportunidades.
5. **Refinos R2 → R4 → R5** — intercalados conforme dor.
6. **Onda 5** — somente após decisões de negócio fechadas.

**Inversão possível:** se houver auditoria externa próxima, Calibração e Saúde & Segurança sobem para antes da 4B.

---

## Próxima ação

Iniciar pela **Etapa 0**. Onda 4A só será detalhada tecnicamente após a homologação documentada dos 10 temas em `docs/sgq-homologacao-onda4.md`.

Confirma que posso gerar a Etapa 0 agora?
