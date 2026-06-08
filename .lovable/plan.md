# Plano em execução — SGQ

**Etapa 0** ✅ Homologação dos 10 temas em `docs/sgq-homologacao-onda4.md`.

**Ondas 4A + 4B + 5** ✅ entregues.

## Onda 6 — Quick wins + Lacunas §7 (entregue)

Aprovada com 4 ajustes do usuário (data de avaliação de eficácia, revisão em conhecimento, exclusões estruturadas, push atrás de feature flag).

### Entregas

- **§4.3 — Exclusões de escopo estruturadas**
  - Campo `excluded_clauses jsonb` em `quality_org_context` com trigger de validação (cláusula, título, justificativa, aprovador e data obrigatórios).
  - Novo componente `ExcludedClausesCard` na visão geral de `OrgContext`.
- **§10.3 — Eficácia de melhorias com prazo**
  - Campos `effectiveness_review_due_at` e `effectiveness_review_period_days` em `quality_improvements_manual`.
  - Hook `useQualityImprovements.scheduleEffectivenessReview` para agendar 30/60/90 dias.
  - Alerta `improvement.effectiveness_due` em `quality_alerts_v`.
- **§7.1.6 — Conhecimento Organizacional**
  - Nova tabela `quality_knowledge_articles` (status, versão, tags, vínculo opcional a NCR/audit, ciclo de revisão).
  - Trigger `quality_knowledge_recalc_review` calcula `review_due_at` automaticamente.
  - Nova página `/quality/knowledge` com criação, publicação, marcação de revisado e filtros.
  - Alerta `knowledge.knowledge_review` em `quality_alerts_v`.
- **§7.4 — Plano de Comunicação**
  - Tabelas `quality_communication_plan` (com enum `quality_communication_type`) e `quality_communication_log`.
  - Página `/quality/communication` agrupada por tipo, com registro de execução e histórico por plano.
- **Calibração reprovada — só alerta**
  - Calibração com `result = reproved` nos últimos 180 dias aparece em `quality_alerts_v` (source `calibration_reproved`) e como alerta vermelho em `DeviceDetail` com botão "Abrir NCR" (navega para `/quality/ncrs` com query pré-preenchida — NCR é criada manualmente).
- **Push notifications — feature flag**
  - Campo `enable_push_notifications boolean` em `quality_settings` (default `false`).
  - Toggle em `Settings.tsx` aba Ciclos com aviso de ruído.
  - Edge function `ai-proactive-check` consumirá a flag em iteração futura (não bloqueante).

### Cobertura funcional (estimativa interna, não-auditor)

| Capítulo | Antes | Depois |
|---|---|---|
| §4 | 80% | 88% |
| §7 | 70% | 82% |
| §9 | 85% | 90% |
| §10 | 80% | 88% |
| **Global** | **~72%** | **~82%** |

## Fora de escopo desta onda (registrado para ondas futuras)

- §7.1.1 Recursos, §7.1.3 Infraestrutura física, §7.1.4 Ambiente de trabalho
- §8.5/§8.6 Produção e liberação (depende de integração com OS)
- Calibração homologada externa (laudo terceirizado validado)
- Automação de envio de campanhas (e-mail/WhatsApp) — link público manual continua a regra
- Embeddings/busca semântica em conhecimento
- Integração de `ai-proactive-check` com `quality_alerts_v` (próxima onda; tabela e flag já prontas)
