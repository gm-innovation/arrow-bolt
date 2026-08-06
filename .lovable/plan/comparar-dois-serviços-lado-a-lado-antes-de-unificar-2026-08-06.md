# Comparar dois serviços lado a lado antes de unificar

Hoje a aba **Duplicados** só oferece "Unificar serviços" com base no texto da sugestão. Falta ver os relatórios dos dois serviços juntos e falta registrar a decisão de "não são duplicatas".

## 1. Comparação lado a lado

Novo botão **Comparar** em cada sugestão, abrindo um diálogo largo com duas colunas (empilhadas no mobile):

- Cabeçalho de cada lado: número(s) de OS, cliente, embarcação, período, quantidade de atendimentos e o motivo da sugestão ao centro.
- Cada coluna reaproveita a navegação de atendimentos já existente do serviço (abas por data/técnico) e a visualização completa do relatório: escopo, texto, materiais declarados e fotos com legenda.
- Rolagem independente por coluna, para ler os dois relatórios em paralelo.
- No rodapé, as duas decisões: **Unificar serviços** e **Não são duplicatas**, além de fechar sem decidir.

## 2. Descartar duplicata

Botão **Não são duplicatas** tanto no card da sugestão quanto no rodapé da comparação, com campo opcional de motivo.

- A decisão fica gravada: o par não volta a aparecer como sugestão.
- Lista de descartes na própria aba Duplicados ("Duplicidades descartadas"), com quem descartou, quando, o motivo e ação de **reverter descarte** — caso a pessoa mude de ideia.
- Se depois os dois serviços forem unificados por outro caminho, o descarte deixa de valer naturalmente.

## Notas técnicas

- Nova tabela `auvo_merge_dismissals` (`company_id`, par de `service_group_id` normalizado em ordem estável com índice único, `reason`, `dismissed_by`, `created_at`), com GRANT explícito, RLS habilitada e políticas por `company_id` para os papéis que já revisam a auditoria (coordinator/director/super_admin).
- `supabase/functions/auvo-sync/index.ts`: no modo `suggest_merges`, carregar os descartes da empresa e filtrar os pares antes de devolver; novos modos `dismiss_merge` e `undo_dismiss_merge`.
- `src/hooks/useAuvoServiceGroups.ts`: query `mergeDismissals` e mutations `dismissMerge` / `undoDismissMerge`, invalidando `auvo-merge-suggestions`.
- Novo `src/components/admin/auvo/AuvoMergeCompareDialog.tsx`: duas colunas usando `AuvoServiceReportTabs` alimentado por `membersByGroup` de cada grupo.
- `src/components/admin/auvo/AuvoMergeSuggestionsPanel.tsx`: botões Comparar e Não são duplicatas, seção de descartados.
- `src/pages/admin/AuvoAudit.tsx`: passar as novas props do hook ao painel.
