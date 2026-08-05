# Agrupar divergências por OS na auditoria Auvo

Hoje cada divergência gera uma linha própria, então uma OS com 8 materiais divergentes aparece 8 vezes. A tabela passa a ter **uma linha por OS/atendimento**, com as divergências dentro dela.

## Como fica

- Linha principal (por atendimento Auvo): número da OS + data, cliente/técnico, contagem de divergências (com destaque para "sem baixa no relato"/"sem relato"), valor total em risco, status consolidado da revisão (ex.: "3 pendentes · 5 tratadas") e ações da OS (Reanalisar, expandir).
- Clique na linha (ou no chevron) expande e mostra os materiais daquela OS em subtabela: material/código, estoque, relatório, risco, classificação, notas da IA, status e botão **Revisar** de cada item.
- Ordenação das OS por gravidade (OS com material sem relato primeiro), depois por valor em risco.
- Busca e filtros continuam funcionando por item; uma OS aparece quando tem ao menos um item que passa no filtro, e a expansão mostra só os itens filtrados.
- "Reanalisar" deixa de repetir por linha e passa a ser uma ação por OS (era o mesmo `auvo_task_uid` em todas as linhas).
- O diálogo de revisão (relatório + seção Material fornecido + fotos) segue igual, aberto a partir do item.

## Técnico

- `src/pages/admin/AuvoAudit.tsx`: após o `filtered` atual, agrupar por `auvo_task_uid` em um `useMemo` (chave: OS, data, cliente, técnico, itens, totais, contagens por classificação e por `review_status`). Renderizar com estado local `expanded: Set<string>` e `React.Fragment` por grupo (linha resumo + linha expandida com subtabela em `colSpan`).
- Nenhuma mudança de dados/hook/backend: `useAuvoIntegration` já retorna as divergências com `auvo_tasks` aninhado.
