# Revisão de todas as divergências da OS em um único modal

Hoje o botão "Revisar" abre o modal para **um material só**. Numa OS como a 4821, com 10+ materiais baixados do estoque e fora do relatório, é preciso abrir e fechar o modal item por item. O modal passa a ser **por serviço/OS**, com todos os materiais listados dentro dele.

## Como fica

- Na linha do serviço (linha principal da tabela) o botão passa a ser **"Revisar divergências (N)"**. O botão "Revisar" de cada item continua existindo, mas agora abre o mesmo modal do serviço já com aquele material selecionado/rolado.
- Dentro do modal, coluna da direita vira uma **lista de todos os materiais divergentes do serviço**, cada linha com:
  - nome + código, baixa no estoque × relatado, valor em risco, classificação (badge) e notas da IA;
  - seletor de conclusão próprio (Confirmada / Justificada / Descartar);
  - campo de observações próprio (compacto, expande ao focar);
  - badge do status atual quando já foi revisado.
- **Ações em massa** no topo da lista: "Aplicar a todos" (escolhe conclusão + observação e replica nos itens ainda não decididos) e contador "X de N decididos".
- Coluna da esquerda continua com as abas de atendimentos e o relatório completo do técnico (sem alteração), servindo de referência para todos os itens.
- Rodapé: **"Salvar N revisões"** grava tudo de uma vez; itens sem conclusão escolhida ficam intactos. Toast informa quantos foram salvos.
- Total em risco do serviço e resumo ("X pendentes · Y tratadas") ficam visíveis no cabeçalho do modal.

## Técnico

- `src/pages/admin/AuvoAudit.tsx`: trocar o estado `reviewTarget: AuvoDiscrepancy` por `reviewGroup` (o grupo já calculado no `useMemo` de agrupamento) + `focusItemId`. Estado local `decisions: Record<string, { status, notes }>` inicializado a partir de `review_status`/`review_notes` de cada item.
- Extrair o conteúdo do modal para `src/components/admin/auvo/AuvoGroupReviewDialog.tsx` (o modal atual está inline com ~70 linhas e cresceria demais), reutilizando `AuvoServiceReportTabs`.
- Salvamento: iterar as decisões alteradas chamando a mutation existente `reviewDiscrepancy` (`useAuvoIntegration`) em `Promise.all`, invalidando as queries uma vez ao final. Sem mudança de schema, RLS ou Edge Function.
