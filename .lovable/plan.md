## Objetivo
Permitir abrir o modal de detalhes do lead ao clicar em qualquer parte do card (Kanban de Oportunidades e tabela da aba Leads do Site), sem interferir no botão **Converter** nem no drag-and-drop.

## Passos

1. **Extrair `LeadDetailsDialog` para componente próprio** (`src/components/commercial/opportunities/LeadDetailsDialog.tsx`)
   - Mover o `<Dialog>` de detalhes que hoje vive dentro de `SiteLeadsTab.tsx` (empresa, contato, mensagem, itens de interesse, seletor de status, botão "Converter").
   - Recebe: `lead`, `open`, `onOpenChange`, `onConvert(lead)`, `onStatusChange(id, status)`.
   - Mantém a mesma UI atual (nada muda visualmente).

2. **Tornar os mini-cards de lead do Kanban clicáveis** (`OpportunityKanban.tsx`)
   - Adicionar prop opcional `onLeadClick?: (lead: Lead) => void`.
   - Envolver o `LeadMiniCard` num container `role="button"` com `onClick={onLeadClick}`.
   - No botão **Converter**, adicionar `e.stopPropagation()` para não abrir o modal ao converter.
   - Drag-and-drop continua funcionando (o handler do dnd não dispara `onClick`).

3. **Wire up em `Opportunities.tsx`**
   - Novo estado `detailLead: Lead | null`.
   - Passar `onLeadClick={setDetailLead}` para o `OpportunityKanban`.
   - Renderizar `<LeadDetailsDialog>` no final da página, com `onConvert` reaproveitando `handleConvertLead` e `onStatusChange` usando `useSiteLeads().setStatus`.

4. **Reusar em `SiteLeadsTab.tsx`**
   - Trocar o `<Dialog>` interno pelo novo `<LeadDetailsDialog>` importado.
   - Tornar a **linha da tabela** clicável (`onClick` na `<TableRow>`), mantendo `stopPropagation` no botão "Converter" e no ícone do "olho" (que passa a ser opcional/redundante — posso remover o ícone já que a linha inteira abre o modal).

## Sem mudanças
- Banco de dados, edge functions, permissões e o fluxo de conversão continuam iguais.
- Estilo e conteúdo do modal permanecem os mesmos, só ficam acessíveis a partir de mais lugares.
