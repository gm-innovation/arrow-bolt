# Plano em execução — SGQ

**Etapa 0** ✅ Homologação dos 10 temas em `docs/sgq-homologacao-onda4.md`.

**Onda 4A + Extensão 4A + R1 + R3** ✅ entregues nas iterações anteriores.

**Refinos R2, R4 e R5** ✅ entregues nesta iteração:

- **R2 — Master · SLA · delegação · trilha:**
  - `quality_settings` ganhou `master_delegate_user_id`, `master_delegate_until` e `central_approval_sla_hours`.
  - Nova tabela `quality_central_approval_events` (RLS por company_id) com eventos `requested · approved · rejected · commented · reassigned`.
  - Hook `useCentralApproval` grava evento em request/decide e expõe `comment`; novo `useCentralApprovalEvents` carrega trilha por aprovação.
  - `useQualitySettings` calcula `delegateActive`, `isDelegate`, `canDecideCentral` e `slaHours`.
  - `CentralApproval.tsx` reescrito: cards de Master · Delegação (com vigência) · SLA · Escopo · Fila com badge de SLA (no prazo · atenção · vencido) e expansão de Trilha com comentários.
  - `Deviations.tsx` passou a usar `canDecideCentral` para liberar Aprovar/Rejeitar.

- **R4 — Lista Mestre filtros + XLSX:**
  - Filtros novos: status (dinâmico) e janela de revisão (Atrasada · ≤ 30d · Em dia · Sem ciclo).
  - Contadores no topo (atrasada · próxima · total).
  - Realce visual da coluna "Próxima revisão".
  - Exportação **XLSX** via biblioteca `xlsx` (planilha "Lista Mestre" com largura de colunas) e CSV com BOM utf-8 mantida.

- **R5 — Política da Qualidade diff + ciência por departamento:**
  - Nova tabela `quality_policy_versions` (id, version, text, published_by, published_at) com RLS por company_id.
  - Trigger `quality_snapshot_policy_on_change` arquiva a versão anterior ao publicar a nova.
  - `useQualityPolicy` retorna `versions` e `useQualityPolicyDeptAcks` agrega ciência por departamento.
  - `QualityPolicy.tsx` reescrito com Tabs: **Editor** · **Histórico & diff** (line diff inline com seletor de versão para comparação) · **Adesão por departamento** (cobertura por dept + barra de progresso).
  - `src/lib/textDiff.ts` implementa LCS de linhas (sem nova dependência).

## Próximas ondas
- **Onda 4B** — submódulo Planejamento dentro de Riscos & Oportunidades (objetivos, indicadores, mudanças planejadas).
- **Onda 5** — bloqueada até decisões de negócio (RH/Recursos, Documentos do colaborador, Calibração, Satisfação do Cliente, Saúde e Segurança).
