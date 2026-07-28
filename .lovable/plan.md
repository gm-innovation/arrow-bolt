# Roadmap: prompt de dev, roteamento automático, drag & drop e histórico

Consolidando os dois pedidos: (1) prompt de dev nos itens do Roadmap e (2) melhorias que entram como ticket devem cair automaticamente em "Gelo", com drag & drop entre colunas e uma visão de histórico/versionamento.

## 1. Prompt para Lovable em cada item do Roadmap

Local: `src/pages/super-admin/PMDashboard.tsx`, dentro do `AccordionContent`, após o bloco "Defesa".

- Reutilizar a Edge Function `generate-ticket-dev-prompt` (mesma dos tickets) — nenhum backend novo.
- Persistir em `support_tickets.dev_prompt` (coluna já existente).
- Se existir: `<pre>` com scroll + botões **Copiar** e **Regenerar**.
- Se não existir: botão **Gerar prompt para Lovable** com spinner; ao concluir, inserir inline.
- Hook `useGenerateRoadmapPrompt` invalida a query do roadmap.

## 2. Roteamento automático: melhorias → Gelo

Regra: todo ticket cuja categoria não seja bug/correção (ou seja, `feature_request`, `improvement`, `suggestion`) deve entrar no Roadmap na coluna "Gelo" e virar item arrastável.

Implementação backend (uma migração):
- Adicionar coluna `roadmap_horizon` em `support_tickets` (`text` com CHECK em `now|next|later|icebox|null`) e `roadmap_position` (`integer`, para ordenação).
- Trigger `BEFORE INSERT` em `support_tickets`: se `category IN ('feature_request','improvement','suggestion')` e `roadmap_horizon IS NULL`, setar `roadmap_horizon = 'icebox'` e prefixar título com `[Roadmap]` quando ainda não tiver o prefixo.
- Backfill: itens `[Roadmap]` existentes recebem horizonte derivado do estado atual (já implícito no código) — feito via `UPDATE` no insert tool após a migração.
- Ajustar a query do `usePMDashboard` para agrupar por `roadmap_horizon` em vez de heurística por título.

## 3. Drag & drop entre colunas do Roadmap

- Usar **@dnd-kit/core** + **@dnd-kit/sortable** (leves, acessíveis, sem conflito com Radix).
- Cada coluna vira um `<SortableContext>` (droppable) e cada `AccordionItem` vira `useSortable` com handle discreto (ícone `GripVertical` no topo do item).
- Ao soltar:
  - Se mudou de coluna → `UPDATE roadmap_horizon` no ticket.
  - Se mudou de posição → `UPDATE roadmap_position` nos afetados (recalcular a coluna).
  - Otimista via `queryClient.setQueryData`, rollback em erro, toast de confirmação.
- Restrição: apenas `super_admin` pode arrastar (checado no hook e via RLS existente para UPDATE de tickets).
- Não interferir com o clique do acordeão: o drag só inicia via handle (activation constraint `distance: 8`).

## 4. Histórico e versionamento

Nova aba **"Histórico"** no `PMDashboard` (`/super-admin/pm-dashboard`).

Fonte de dados:
- `pm_changelog` (já existente) para versões publicadas/entregas.
- `support_tickets` filtrados por `status IN ('resolved','closed')` e/ou `category IN ('bug','improvement','feature_request')`, ordenados por `resolved_at` desc.

UI:
- Filtros no topo: tipo (Correção / Melhoria / Feature), período, módulo.
- Timeline agrupada por **semana** (ou por versão do changelog quando houver `pm_changelog.version` associado).
- Cada card mostra: número do ticket, título, tipo (badge), módulo, data de resolução, autor, e um "Ver detalhes" abrindo o `TicketDetailDialog`.
- Botão **"Publicar versão"** (super_admin): abre modal para agrupar tickets resolvidos desde o último changelog em uma nova entrada `pm_changelog` (número de versão, resumo, destaques). Isso conecta tickets → versão.
- Adicionar coluna `pm_changelog_id` (nullable) em `support_tickets` para vincular ao changelog publicado; preenchida no ato da publicação da versão.

## Detalhes técnicos

- Migração única cobrindo: `roadmap_horizon`, `roadmap_position`, `pm_changelog_id`, trigger de roteamento, índices em `(roadmap_horizon, roadmap_position)` e `(pm_changelog_id)`.
- Após a migração, `insert` para popular `roadmap_horizon` dos 22 itens `[Roadmap]` existentes conforme distribuição atual.
- Instalar `@dnd-kit/core` e `@dnd-kit/sortable`.
- Refatorar `usePMDashboard.ts` para expor `moveTicket(ticketId, toHorizon, toIndex)`.
- Novo componente `RoadmapColumn.tsx` para encapsular droppable + acordeão sortable.
- Nova página/aba `PMHistoryTab.tsx` reaproveitando `TicketDetailDialog`.
- Sem mudanças na Marina; a Edge `generate-ticket-dev-prompt` permanece igual.

## Verificação

- Criar um ticket via suporte com categoria "melhoria" → aparece em Gelo com `[Roadmap]` no título.
- Arrastar um item de Gelo para Próximo → persistir após refresh.
- Expandir item → gerar prompt → copiar → verificar cache no reabrir.
- Resolver um ticket → aparecer na aba Histórico → publicar versão → itens ficam agrupados sob a nova entrada de changelog.
