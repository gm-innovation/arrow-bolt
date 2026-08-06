# Corrigir os falsos positivos da auditoria Auvo (OS 4539)

Você está certo: o relatório do atendimento 69566199 (Alexsandro Calheiros, 06/02, código externo 4539) existe, tem 9 fotos e todas com legenda. Foram dois defeitos nossos, ambos confirmados no banco.

## Defeito 1 — "s/ relatório" falso

A tela carrega atendimentos e relatórios com `limit(2000)`, mas o backend devolve no máximo **1000 linhas por consulta**. Hoje existem **1.185 atendimentos** e **1.172 relatórios**: tudo que passa de 1.000 simplesmente não chega ao navegador, e o atendimento fica marcado como "sem relatório" mesmo tendo texto.

Correção: paginar as consultas de `auvo_tasks` e `auvo_task_reports` até trazer todas as linhas (blocos de 1.000 com `range`), buscando apenas as colunas necessárias. Enquanto os dados não estiverem completos, não exibir o rótulo "sem relatório" — usar estado neutro em vez de afirmar ausência.

## Defeito 2 — "Sem foto" em atividades que estão fotografadas

As pendências de foto desse relatório foram gravadas às **16:15**, e as legendas das fotos só passaram a ser importadas do Auvo às **16:31** (correção da ingestão). Ou seja, a IA auditou um relatório cujas fotos apareciam sem legenda nenhuma — daí os cinco apontamentos falsos (conector TNC, PV teste, SSAS, e-mails, antena), todos com legenda explícita no Auvo: "foto da confecção de um novo conector", "foto do PV teste", "foto do SSAS", "foto de confirmação de envio do SSAS", "foto da base da antena".

Correções:

1. **Invalidar e reprocessar** as pendências criadas antes da correção da ingestão: apagar as pendências pendentes de revisão cujos relatórios foram reimportados depois, e recolocar esses relatórios na fila de auditoria de fotos.
2. **Travar a auditoria contra dado incompleto**: não auditar fotos de um relatório enquanto as legendas do Auvo não tiverem sido importadas (nem gerar pendência quando não há informação sobre as fotos). Sem legenda e sem descrição visual, o relatório vai para a fila da etapa de visão, não para apontamento.
3. **Exigir evidência do apontamento**: cada pendência só é gravada com o registro do que foi considerado (legendas avaliadas e/ou fotos candidatas). Pendência sem esse lastro é bloqueada.

## Defeito 3 — escopo trocado no mesmo número de OS

O atendimento de Inmarsat-C foi lançado no Auvo com o código externo 4539, o mesmo dos 13 atendimentos de CFTV/DGPS do Skandi Ipanema, então tudo caiu no mesmo serviço. Isso é erro humano de numeração, mas a tela precisa deixar claro:

- Cada pendência de foto passa a mostrar a origem: nº do atendimento Auvo, técnico e data.
- Pendências agrupadas por atendimento dentro do modal de revisão, em vez de lista única.
- Aviso quando o mesmo número de OS reúne atendimentos de escopos claramente distintos, com ação para desvincular o atendimento do serviço.

## Notas técnicas

- `src/hooks/useAuvoServiceGroups.ts` — paginação real de `auvo_tasks`/`auvo_task_reports`; `hasReport` só é `false` quando a busca completou.
- `src/components/admin/auvo/AuvoServiceReportTabs.tsx` e `src/pages/admin/AuvoAudit.tsx` — rótulo neutro durante o carregamento, origem por atendimento e aviso de escopo divergente.
- `supabase/functions/auvo-sync/photoAudit.ts` — guarda de dados incompletos e obrigatoriedade de evidência (legendas/candidatas) para gravar pendência.
- Limpeza pontual: remover pendências de foto `pending` geradas antes da correção da ingestão e marcar os relatórios afetados para reauditoria (nenhuma decisão humana já registrada é apagada).
- `src/components/admin/auvo/AuvoGroupReviewDialog.tsx` — agrupamento por atendimento e ação de desvincular.

Também vale revisar depois se outras telas com `limit` alto sofrem do mesmo teto de 1.000 linhas.
