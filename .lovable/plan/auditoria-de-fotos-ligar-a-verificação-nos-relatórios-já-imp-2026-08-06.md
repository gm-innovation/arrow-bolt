# Auditoria de fotos: ligar a verificação nos relatórios já importados

## O que está acontecendo

Não há nenhuma divergência de evidência fotográfica porque a auditoria de fotos **nunca rodou** — não porque os relatórios estejam completos.

Confirmado no banco:

- `auvo_photo_findings`: 0 registros.
- `auvo_task_reports`: 1.051 relatórios, **todos** com `photo_audit_status = 'pending'` (nenhum auditado).
- `auvo_service_groups`: 501 serviços, todos com `analysis_status = 'done'`.
- Existe material para auditar: 656 relatórios com anexos e 677 com texto.

Causa: a auditoria de fotos foi acoplada dentro da análise do serviço (`analyzeServiceGroup`). Como todos os 501 serviços já estavam com análise concluída antes dessa funcionalidade existir, nenhum deles é reprocessado e a auditoria de fotos nunca é acionada.

## O que fazer

1. **Novo modo de backfill na função `auvo-sync`** (`mode: "photo_audit_batch"`):
   - seleciona relatórios com `photo_audit_status = 'pending'` (prioriza os mais recentes e os que têm texto de relatório),
   - roda `auditReportPhotos` por relatório, respeitando um orçamento de tempo por execução,
   - grava lacunas em `auvo_photo_findings` preservando revisões já feitas (mesma lógica de `activity_key` já usada hoje),
   - atualiza `photo_audit_status` para `ok`/`gaps`, além de `photo_count`, `photo_audited_at` e `photo_audit_notes`,
   - marca `error` com contador de tentativas quando a chamada de IA falha, para não travar a fila,
   - devolve `processed`, `gaps`, `failed`, `remaining`.

2. **Relatório sem texto**: marcar como `skipped` (não há atividade declarada para confrontar) em vez de deixar pendente para sempre.

3. **Fila automática**: incluir o novo modo no agendamento existente (`pg_cron`) que já consome `analyze_batch`, para o backfill dos 1.051 relatórios andar sozinho.

4. **Interface em `/admin/auvo-audit`**:
   - card/painel de progresso da auditoria de fotos (auditados / pendentes / com lacuna / erro),
   - botão "Auditar fotos" para disparar lotes manualmente,
   - botão de reprocessar um relatório específico (reset para `pending`).

5. **Diretoria**: depois do backfill, refletir o risco de evidência fotográfica na aba de divergências do dashboard `/manager/dashboard`, junto do risco de material.

## Detalhes técnicos

- Arquivos: `supabase/functions/auvo-sync/index.ts` (novo modo + extração da rotina de fotos para função reutilizável), `supabase/functions/auvo-sync/photoAudit.ts` (sem mudança de contrato), `src/hooks/useAuvoIntegration.ts` (query de progresso + mutation `runPhotoAuditBatch`), `src/pages/admin/AuvoAudit.tsx` (painel e botões), `src/components/manager/dashboard/AuvoDiscrepancyTab.tsx`.
- Sem mudança de esquema: as colunas `photo_audit_status`, `photo_count`, `photo_audited_at`, `photo_audit_notes` e a tabela `auvo_photo_findings` já existem.
- O backfill usa IA por relatório; o processamento em lotes com orçamento de tempo evita estouro de execução e controla custo.
