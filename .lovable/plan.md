# Auditoria de evidência fotográfica dos relatórios Auvo

Hoje a auditoria Auvo cruza apenas materiais (estoque EVA x seção "MATERIAL FORNECIDO"). As fotos dos atendimentos são importadas (`auvo_task_reports.attachments`) e exibidas na galeria do relatório, mas ninguém verifica se elas cobrem o serviço executado.

Objetivo: a IA ler as atividades declaradas em cada relatório e apontar quais não têm evidência fotográfica — excesso de fotos nunca é problema, ausência é.

## Como vai funcionar

1. Na análise de um serviço, cada relatório (atendimento) passa por uma segunda checagem: a IA extrai as atividades/serviços executados do texto e recebe a lista de fotos do atendimento (com legenda/nome do arquivo e, quando existir, a resposta de questionário associada) para julgar a cobertura.
2. Resultado por atendimento:
   - **Coberto** — todas as atividades relevantes têm foto correspondente.
   - **Parcial** — parte das atividades sem evidência (lista as atividades descobertas).
   - **Sem evidência** — relatório com serviço executado e nenhuma foto: severidade alta.
   - **Não aplicável** — atendimento sem atividade que exija foto.
3. As pendências aparecem junto das divergências de materiais, sempre com o **tipo de pendência** explícito por OS/serviço (ver seção abaixo).
4. No modal de revisão consolidada (`AuvoGroupReviewDialog`), um bloco "Evidência fotográfica" lista, por atendimento (técnico + data), as atividades sem foto, com galeria de miniaturas do que existe e o mesmo fluxo de conclusão (confirmada / justificada / descartar) e observações — inclusive "Aplicar a todos". Quando o serviço só tem pendência de um dos tipos, apenas o bloco correspondente é exibido, com uma nota de que o outro está em conformidade.
5. Alerta e KPIs: atendimentos "sem evidência" entram na notificação de divergências relevantes do serviço e no resumo crítico do dashboard da diretoria, como linha própria ("Relatórios sem evidência fotográfica"), sem se misturar ao valor financeiro em risco.

## Materiais x fotos: pendências independentes

Uma OS pode ter divergência de material sem problema de foto, problema de foto sem divergência de material, ou os dois. Cada serviço passa a ter um **tipo de pendência** calculado a partir das duas auditorias, exibido como selo na lista e nos filtros:

| Selo | Significado |
| --- | --- |
| **Materiais** (âmbar) | Divergência de material pendente; evidência fotográfica em conformidade. |
| **Fotos** (roxo) | Atividades sem evidência fotográfica; materiais conferem. |
| **Materiais + Fotos** (vermelho) | Os dois problemas no mesmo serviço — prioridade máxima. |
| **Em conformidade** (verde) | Auditado, sem pendência nos dois eixos. |
| **Não auditado** (cinza) | Análise pendente ou com erro em pelo menos um dos eixos. |

- Cada selo mostra o próprio número: risco em R$ e nº de materiais no eixo de materiais; nº de atendimentos e de atividades sem foto no eixo de fotos.
- Filtro na tela de auditoria: "Todas", "Só materiais", "Só fotos", "Ambos", com contagem em cada opção; a ordenação padrão coloca "Materiais + Fotos" no topo.
- Na diretoria, o resumo crítico e o cartão de KPI passam a distinguir as três contagens (só materiais / só fotos / ambos) em vez de um total único.
- As conclusões de revisão são independentes: fechar as divergências de material não zera as pendências de foto (e vice-versa); o serviço só sai da fila quando os dois eixos estiverem resolvidos.


## Detalhes técnicos

**Banco**
- Nova tabela `auvo_photo_findings` (`company_id`, `service_group_id`, `auvo_task_uid`, `report_id`, `activity`, `expected_evidence`, `severity`, `ai_notes`, `photo_count`, `review_status`, `review_notes`, `reviewed_by`, `reviewed_at`, timestamps) com `GRANT` explícito + RLS espelhando as políticas de `auvo_material_discrepancies`.
- Em `auvo_task_reports`: `photo_audit_status` (`pending|covered|partial|missing|not_applicable`), `photo_count`, `photo_audit_notes`, `photo_audited_at`.
- A revisão humana é preservada na reanálise pela mesma estratégia de chave usada em materiais (`auvo_task_uid` + atividade normalizada).

**Edge Function `auvo-sync`**
- Novo módulo `photoAudit.ts`: extrai as seções de trabalhos executados do relatório (reaproveitando o parser de seções de `reportSections.ts`), monta o prompt com atividades + inventário de fotos e devolve as atividades sem evidência via saída estruturada (schema enxuto, limites no prompt e não no schema).
- Chamado dentro de `analyzeServiceGroup`, por relatório, após a extração de materiais; grava `auvo_photo_findings` (delete + insert por `taskIds`, preservando revisões) e atualiza os campos de auditoria em `auvo_task_reports`.
- Modelo: Gemini Flash da geração atual do catálogo, texto apenas nesta etapa (nomes/legendas das fotos). A análise visual do conteúdo das fotos fica fora do escopo desta entrega.
- `notifyDiscrepancies` recebe também a contagem de atendimentos sem evidência.

**Frontend**
- `useAuvoIntegration.ts`: buscar findings de foto por grupo e mutation `reviewPhotoFindingsBulk` (mesmo padrão de `reviewDiscrepanciesBulk`).
- `AuvoGroupReviewDialog.tsx`: bloco de evidência fotográfica por atendimento, com miniaturas de `attachments` e controles de conclusão.
- `AuvoAudit.tsx`: selo/contagem por OS na lista agrupada e no filtro de pendências.
- `useAuvoCriticalSummary.ts` + `AuvoDiscrepancyAlert`/`ManagerStats`: incluir a contagem de relatórios sem evidência.

## Fora do escopo

- Visão computacional sobre o conteúdo das fotos (comparar o que a imagem mostra com a atividade).
- Regra de mínimo fixo de fotos por atendimento.
