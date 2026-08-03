# Roadmap: retirar itens resolvidos

## Situação atual

O Roadmap (Agora / Próximo / Depois / Gelo) é montado a partir dos próprios chamados de suporte: entram no board todos os chamados das categorias de melhoria, sugestão e nova funcionalidade, independentemente do status. Hoje há 1 chamado de melhoria já marcado como "Resolvido" — e ele continua ocupando espaço na coluna do roadmap.

## O que muda

1. Chamados de melhoria/desenvolvimento marcados como **Resolvido** (ou Fechado) deixam de aparecer nas colunas do roadmap.
2. No topo do Roadmap, um contador "Entregues: N" com um botão de alternância **Mostrar entregues**, para consultar o histórico quando necessário (padrão: oculto).
3. Ao marcar um chamado como Resolvido pelo Inbox de Suporte ou pelo detalhe do item, o board é atualizado na hora (o item sai da coluna sem precisar recarregar).

Nada é apagado: o item continua no Inbox de Suporte, no histórico e com seu horizonte gravado — apenas sai da visão ativa do roadmap.

## Detalhes técnicos

- `src/pages/super-admin/RoadmapBoard.tsx`: no agrupamento por horizonte, ignorar itens com `status` em `resolved`/`closed`, exceto quando o novo estado local `showDelivered` estiver ativo (nesse caso, renderizar o card com estilo esmaecido e badge "Entregue").
- Contador de entregues calculado no mesmo `useMemo`; toggle via `Button` variant `ghost` no cabeçalho do board.
- Bloquear drag-and-drop para itens entregues (não passar listeners do `useSortable`) para não reordenar histórico.
- Garantir que a mutação de status no Inbox invalide também a query `["pm-tickets"]` para o board refletir imediatamente.
