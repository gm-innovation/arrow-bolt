# Onda 6 — revisada com seus 4 ajustes

Aprovados os refinamentos. Plano reorganizado na ordem de prioridade que você definiu, com escopo realista (sem prometer "satisfação completa" enquanto a coleta for manual).

## Linguagem do entregável (sem inflar expectativa)

A Onda 6 entrega, para Satisfação:
- ✅ Gestão da pesquisa (campanhas, perguntas, período)
- ✅ Geração de link público por convite
- ✅ Consolidação de resultados (NPS/CSAT/CES)
- ✅ Dashboard e histórico por campanha
- ✅ Integração com VoC e tratativas (reclamação → NCR)
- ❌ **Não entrega:** automação de coleta (e-mail/WhatsApp). Disparo é manual.

Cobertura projetada será tratada como **"estimativa interna de cobertura funcional"**, não "cobertura ISO".

---

## Ordem de execução (sua prioridade)

### 1. §4.3 — Exclusões de escopo (estruturadas)

Em `quality_org_context`, novo campo `excluded_clauses jsonb` com schema validado por trigger:

```json
[
  {
    "clause": "8.3",
    "title": "Projeto e Desenvolvimento",
    "justification": "A organização não projeta produtos/serviços; opera sob especificações do cliente.",
    "approved_at": "2026-06-08T00:00:00Z",
    "approved_by": "<uuid>"
  }
]
```

- Trigger `validate_excluded_clauses` rejeita itens sem `clause`, `title`, `justification`, `approved_at`, `approved_by`.
- Bloco "Exclusões justificadas" em `OrgContext.tsx`: lista + dialog de adicionar/editar (clausula, título, justificativa). `approved_by` = `auth.uid()` no save; `approved_at` = `now()`.
- Renderizado no card de escopo e nas entradas de análise crítica.
- Seed inicial: §8.3 com justificativa default editável.

### 2. §10.3 — Eficácia de melhorias (com prazo de avaliação)

Adicionar em `quality_improvements_manual` (alguns campos já existem; faltam outros):

| Campo | Tipo | Observação |
|---|---|---|
| `effectiveness_review_due_at` | `date` | **Novo** — definido ao fechar a melhoria (ex.: hoje + 30/60/90 dias) |
| `effectiveness_status` | enum | já existe (`pendente/eficaz/ineficaz/nao_aplicavel`) |
| `effectiveness_verified_at` | timestamptz | já existe |
| `effectiveness_verified_by` | uuid | já existe |
| `effectiveness_notes` | text | já existe |

- Ao marcar `status = done`, dialog pergunta janela (30/60/90 dias ou data custom) → grava `effectiveness_review_due_at`.
- Lista "Eficácia pendente" com badge **Atrasado** quando `now() > review_due_at AND effectiveness_status = pendente`.
- Inclui no `quality_alerts_v` como nova fonte `improvement_effectiveness_due`.

### 3. §7.1.6 — Conhecimento Organizacional (com revisão)

Nova tabela `quality_knowledge_articles`:

```text
id, company_id, title, body, category, tags[],
source_type, source_id,        -- vínculo opcional a NCR/audit/review
author_id, status,              -- draft/published/archived
version, published_at,
review_period_months,           -- ciclo de revisão
reviewed_at, reviewed_by,
review_due_at,                  -- calculado: reviewed_at + period
created_at, updated_at
```

- Página `/quality/knowledge` com lista, filtro por categoria/tag e busca textual (sem embeddings nesta onda).
- Botão "Marcar como revisado" gera novo `reviewed_at` e recalcula `review_due_at`.
- Badge **Revisão atrasada** quando `now() > review_due_at`.
- Inclui em `quality_alerts_v` como fonte `knowledge_review_overdue`.
- Botão "Registrar lição aprendida" em `NCRs.tsx` e `Audits.tsx` pré-preenche o artigo com `source_type`/`source_id`.

### 4. §7.4 — Plano de comunicação (com tipo)

Novas tabelas:

```text
quality_communication_plan(
  id, company_id, subject, communication_type, target_audience,
  channel, frequency, owner_id, next_scheduled_at, status,
  created_at, updated_at
)

quality_communication_log(
  id, plan_id, executed_at, executed_by, evidence_url, notes,
  created_at
)
```

- `communication_type` como enum: `training`, `quality_policy`, `meeting`, `campaign`, `alert`, `management_review`, `other`.
- Página `/quality/communication` com tabela + dialog de execução.
- Filtro/contagem por `communication_type` no dashboard.
- Inclui em `quality_build_review_inputs` (entrada automática na análise crítica).

### 5. §9.1.2 — Gestão da pesquisa de satisfação

Já há `useSatisfactionCampaigns` e rota pública `/s/...` (`SatisfactionResponse.tsx`). Falta:

- Polir UI de criação de campanha em `VoiceOfCustomer.tsx` (aba "Campanhas").
- Tela de detalhe `/quality/satisfaction/:id` consolidando convites + respostas + médias.
- Botão "Copiar link público" por convite.
- Dashboard NPS/CSAT/CES por campanha (média, distribuição, taxa de resposta).
- **Mensagem clara na UI:** "O envio dos convites é manual — copie o link e distribua pelo canal de sua preferência."

### 6. Alerta de calibração reprovada (NCR manual)

- Trigger `AFTER INSERT ON quality_calibrations WHEN result = 'reproved'`:
  - Insere em `quality_alert_history` com `severity = 'high'`, `requires_acknowledgement = true`, `source_type = 'calibration_reproved'`.
  - Adicionar essas colunas a `quality_alert_history` se ainda não existirem.
- Em `DeviceDetail.tsx`: badge vermelho + botão "Abrir NCR a partir deste alerta" → form pré-preenchido (origem=calibração, instrumento, descrição, severidade alta).
- Botão "Reconhecer alerta" exigido antes de fechar (atende `requires_acknowledgement`).

### 7. Push notifications (atrás de feature flag, **desligado por padrão**)

- Novo registro em `quality_settings`: `enable_push_notifications boolean default false`.
- Estender `ai-proactive-check` para ler `quality_alerts_v` e emitir push **somente** quando a flag estiver ligada para a empresa.
- Independente da flag, alertas sempre aparecem no **dashboard** e na **notificação interna** (`useNotifications`).
- Toggle visível em `SettingsHub.tsx` aba Parâmetros, com aviso "Pode gerar ruído. Recomendamos manter desligado e usar o dashboard/notificações internas."

---

## Detalhes técnicos

### Migration consolidada (1 chamada)

1. `ALTER TABLE quality_org_context ADD COLUMN excluded_clauses jsonb DEFAULT '[]'` + trigger de validação.
2. `ALTER TABLE quality_improvements_manual ADD COLUMN effectiveness_review_due_at date`.
3. `ALTER TABLE quality_alert_history ADD COLUMN requires_acknowledgement boolean DEFAULT false, acknowledged_at timestamptz, acknowledged_by uuid` (se faltarem).
4. `ALTER TABLE quality_settings ADD COLUMN enable_push_notifications boolean DEFAULT false`.
5. `CREATE TABLE quality_knowledge_articles (...)` + GRANTs + RLS por `company_id`.
6. `CREATE TABLE quality_communication_plan (...)` + GRANTs + RLS.
7. `CREATE TABLE quality_communication_log (...)` + GRANTs + RLS.
8. `CREATE TYPE quality_communication_type AS ENUM (...)`.
9. Trigger `quality_calibration_reproved_alert` em `quality_calibrations`.
10. Atualizar `quality_alerts_v` para incluir `improvement_effectiveness_due` e `knowledge_review_overdue`.

Todas as tabelas novas:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<t> TO authenticated;
GRANT ALL ON public.<t> TO service_role;
```

### Frontend

- Hooks novos: `useQualityKnowledge`, `useQualityCommunication`.
- Hooks alterados: `useQualityOrgContext` (excluded_clauses), `useQualityImprovements` (review_due_at), `useQualityDevices` (ack do alerta), `useQualitySettings` (push flag), `useQualityAlerts` (novas fontes).
- Páginas novas: `Knowledge.tsx`, `Communication.tsx`, `SatisfactionDetail.tsx` (polimento).
- Páginas alteradas: `OrgContext.tsx`, `VoiceOfCustomer.tsx`, `DeviceDetail.tsx`, `SettingsHub.tsx`/`Settings.tsx`.
- Edge function alterada: `ai-proactive-check` (lê `quality_alerts_v`, respeita flag).

---

## Fora de escopo (documentado, não implementado)

Mesmo após Onda 6, permanecem **abertos para ondas futuras**:
- §7.1.1 Recursos (financeiros/materiais) — sem módulo dedicado
- §7.1.2 Pessoas — competências detalhadas além da matriz GAP
- §7.1.3 Infraestrutura física (não-TI)
- §7.1.4 Ambiente de trabalho
- §8.5/§8.6 Produção e liberação (depende de integração com OS)
- Calibração homologada externa (laudo terceirizado validado)
- Automação de envio de campanhas (e-mail/WhatsApp)
- Embeddings/busca semântica em conhecimento

**Resumo honesto:** Onda 6 fecha aderência **documental e gerencial**, não aderência **operacional completa**.

---

## Estimativa de cobertura funcional (interna, não-auditor)

| Capítulo | Antes | Depois |
|---|---|---|
| §4 | 80% | 88% (escopo com exclusões estruturadas) |
| §7 | 70% | 82% (conhecimento + comunicação com revisão) |
| §9 | 85% | 90% (gestão de pesquisa, sem automação) |
| §10 | 80% | 88% (eficácia com prazo) |
| **Global** | **~72%** | **~82%** |

Lembrete: números servem para priorização de backlog, não como métrica externa.
