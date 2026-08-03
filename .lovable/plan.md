# Tickets concluídos saem de todas as ferramentas

## Regra única

Um chamado com status **Resolvido** ou **Fechado** é considerado *entregue*: sai das superfícies de trabalho (triagem, priorização, roadmap, métricas de trabalho, listas da Marina) e passa a viver apenas no **Histórico** (e no Inbox de Suporte, quando o filtro de status pedir explicitamente).

## Revisão das áreas onde o ticket é replicado hoje

| Área | Hoje | Depois |
| --- | --- | --- |
| Roadmap (Agora/Próximo/Depois/Gelo) | Já oculta entregues, com toggle "Mostrar entregues" | Mantém, mas passa a usar o helper compartilhado |
| Aba "Tickets & Contexto" — Central Agêntica | Lista todos, inclusive resolvidos | Lista só ativos; contador "Entregues: N" com toggle "Mostrar entregues" |
| Aba "Tickets & Contexto" — cartões de números | "Tickets (total)" conta resolvidos | Passa a contar ativos; novo cartão "Entregues" |
| Blast Radius (gráfico por módulo) | Conta resolvidos | Considera só ativos (mede carga atual) |
| Aba Priorização (ICE/RICE) | Tabela mostra resolvidos com score | Oculta entregues; "Calcular pendentes" ignora entregues |
| Aba Histórico | Já é o destino dos resolvidos | Sem mudança |
| Aba Impacto / métricas de produto | Usa log de atividade, não a lista de tickets | Sem mudança |
| Semeadura da árvore OST | Já filtra `open`/`in_progress` | Sem mudança |
| Inbox de Suporte | Filtro de status (padrão "Aberto") | Sem mudança — é a ferramenta de atendimento |
| Marina — `list_roadmap_items` | Devolve itens entregues junto | Passa a excluir entregues por padrão, com parâmetro opcional para incluí-los |
| Meus Chamados (área do usuário) | Mostra o próprio histórico | Sem mudança |

Nada é apagado nem tem o horizonte perdido: o item continua gravado e consultável.

## Detalhes técnicos

- Criar em `src/hooks/usePMDashboard.ts` a fonte única: `DELIVERED_TICKET_STATUSES = new Set(["resolved","closed"])`, `isTicketDelivered(t)` e `splitDeliveredTickets(list)`; exportar.
- `src/pages/super-admin/RoadmapBoard.tsx`: remover as constantes locais `DELIVERED_STATUSES`/`isDelivered` e importar do hook (comportamento inalterado).
- `src/pages/super-admin/PMDashboard.tsx`:
  - `TicketsTab`: derivar `active`/`delivered`; usar `active` na lista, no `blastData` e nos cartões; adicionar estado local `showDelivered` (padrão `false`) com botão `ghost` no cabeçalho do card e badge "Entregue" + título esmaecido nos itens quando exibidos.
  - `PriorityTab`: aplicar `!isTicketDelivered` em `scored`, `unscored` e `roadmapTickets` (este último mantém o filtro atual do board, que já trata entregues internamente).
- `supabase/functions/ai-assistant/tools.ts` → `list_roadmap_items`: adicionar `.not("status","in","(resolved,closed)")` por padrão e o parâmetro booleano `include_delivered` para consultar histórico; atualizar a descrição da ferramenta. Reimplantar a função.
- Invalidação: mutações de status no Inbox já invalidam `["pm-tickets"]`; confirmar que a mudança de status feita pelo diálogo de detalhe do ticket também invalida, para o item sair da lista na hora.
