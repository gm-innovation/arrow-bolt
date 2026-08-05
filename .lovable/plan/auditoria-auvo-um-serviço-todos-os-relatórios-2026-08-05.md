# Auditoria Auvo: um serviço, todos os relatórios

Hoje a auditoria trata cada atendimento do Auvo como um serviço isolado. Verificado nos dados:

- OS **4821** tem hoje apenas 2 atendimentos espelhados (Wagner, com relatório; Kaike Neves, sem relatório) — e só o do Wagner é analisado. O relatório do **Ismael, de maio**, não existe no banco: a base espelhada começa em **01/07/2026** (247 atendimentos, nada antes disso), porque a sincronização só busca os últimos 7 dias (14 na tela). Ou seja, o serviço está incompleto na origem, não apenas na exibição.
- OS **5237** gerou **16 linhas de divergência para 15 itens** em 4 atendimentos: o estoque inteiro da OS é comparado contra cada relatório separadamente, então o mesmo material aparece como "sem relato" em vários atendimentos.
- Existem números em formatos diferentes para a mesma OS (`5322` vs `OS5496`), que hoje nunca se encontram.
- Uma OS pode ficar meses aberta, com técnicos diferentes em cada atendimento, e a auditoria precisa considerar todos eles juntos.


## Como vai funcionar

**Serviço passa a ser a unidade da auditoria.** Cada atendimento do Auvo é vinculado a um "serviço" que reúne todos os atendimentos e relatórios relacionados.

Regra de agrupamento (na ordem):

1. Número da OS normalizado (`OS5496`, `os 5496`, `5496` → `5496`).
2. Sem número, ou números diferentes que apontam para o mesmo trabalho: agrupa por **similaridade** combinando cliente, embarcação, técnicos em comum, escopo (tipo de tarefa/orientação) e proximidade de datas. Só agrupa com evidência forte (mesma embarcação/cliente + ao menos um outro sinal).
3. Todo agrupamento por similaridade fica **marcado como tal**, mostra na tela o motivo ("agrupado por similaridade: mesma embarcação, técnico em comum, 6 dias de intervalo") e tem botão **Desvincular**, que separa aquele atendimento e nunca mais o reagrupa automaticamente.
4. Também haverá **Vincular a outro serviço**, para o coordenador unir manualmente o que o sistema não pegou.

**Cruzamento com o estoque passa a ser por serviço.** Os materiais do EVA são comparados contra a união de tudo que foi declarado em **todos** os relatórios do serviço. Um item só é "baixado do estoque, sem relato" se não aparecer em nenhum relatório. Isso elimina a duplicação e os falsos positivos.

**Tela `/admin/auvo-audit`:**

- Uma linha por serviço (não por atendimento): OS(s) do serviço, período (primeira → última data), cliente/embarcação, todos os técnicos envolvidos, nº de atendimentos, quantos têm relatório, divergências, valor em risco e status da revisão.
- Badge "Agrupado por similaridade" com tooltip do motivo e ação de desvincular.
- Ao expandir: os materiais divergentes do serviço (uma vez cada) e a lista dos atendimentos com data, técnico e se tem relatório.
- No diálogo de revisão, o visualizador de relatório ganha **abas por atendimento** — o revisor lê todos os relatórios do serviço, com fotos e questionários de cada um. Atendimentos sem relatório aparecem sinalizados.
- "Reanalisar" reprocessa o serviço inteiro.

**Janela de sincronização:** padrão passa a ser **desde 1º de janeiro do ano corrente**, com atalhos de 30/90/180 dias e "ano inteiro". A busca no Auvo passa a paginar até o fim do período (sem o corte atual de páginas) e roda em blocos mensais para não estourar o tempo da função, retomando de onde parou entre chamadas. A primeira execução após a mudança faz a carga histórica e traz atendimentos como o do Ismael em maio na OS 4821.

**Alertas** passam a ser por serviço (um alerta consolidado por OS/serviço), não por atendimento.

## Técnico

- Migração: tabela `auvo_service_groups` (company_id, chave normalizada, order_numbers[], client/vessel, período, grouping_reason, is_similarity_grouped) + `auvo_tasks.service_group_id` e `unlinked_from_group` (bool, impede reagrupamento); `auvo_material_discrepancies.service_group_id` (mantém `auvo_task_uid` como referência do relatório de origem, agora nullable no cruzamento consolidado). GRANT + RLS por `company_id` seguindo o padrão das tabelas Auvo existentes.
- `supabase/functions/auvo-sync/`: novo `grouping.ts` com normalização de OS e o escore de similaridade; `index.ts` passa a resolver/criar o grupo no upsert da tarefa e a análise (`analyze`/`analyze_batch`) muda de `task_uid` para `service_group_id`, unindo os `report_text` de todos os relatórios do grupo antes de `extractMaterialsFromReport` e `crossCheck`; a fila de pendências passa a ser por grupo. Paginação do `fetchAuvoTasks` em blocos mensais com cursor no `auvo_sync_runs`.
- Frontend: `useAuvoIntegration` consulta divergências por grupo; novo `useAuvoServiceGroup` para os atendimentos/relatórios do grupo; `AuvoTaskReportView` recebe lista de `auvoTaskUid` e renderiza abas; `AuvoAudit.tsx` troca o agrupamento local por `service_group_id` e ganha as ações de desvincular/vincular.
- Backfill na migração: agrupa o histórico já espelhado pelo número normalizado e reanalisa os grupos com mais de um atendimento.
