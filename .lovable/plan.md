## Objetivo

Substituir o modal de "Detalhes" da página `/admin/opportunities` (coordenador) pelo **mesmo painel usado em `/commercial/opportunities`** — o `EditOpportunitySheet` com abas (Detalhes, Atividades, Tarefas, Produtos), badges de estágio/prioridade/tipo, cabeçalho com Cliente/Responsável/Valor/Idade etc.

## Mudanças

### 1. `src/components/commercial/opportunities/EditOpportunitySheet.tsx`
Adicionar prop opcional `readOnly?: boolean`:
- Quando `true`: desabilita todos os inputs/selects/calendar e oculta os botões **Salvar** e **Excluir**, mantendo todas as abas visíveis (somente leitura).
- Default `false` — comportamento atual do Comercial intacto.

### 2. `src/pages/admin/Opportunities.tsx`
- Remover o componente local `OpportunityDetailDialog` e os ícones/imports não usados (`Eye`, `Mail`, `Phone`, `Building2`, `Dialog*` se não restar uso).
- Importar `EditOpportunitySheet`, `useOpportunities` (para `updateOpportunity` / `deleteOpportunity`) e `useBuyers`; carregar `clients` (id, name) via query simples já no padrão da página comercial.
- Ao clicar em **Detalhes** num card:
  - Buscar a oportunidade completa pelo id via `useOpportunities().opportunities.find(...)` (mesma shape `Opportunity` esperada pelo Sheet).
  - Abrir o `EditOpportunitySheet` com:
    - `readOnly={opp.segment === 'product'}` (Comercial/Marketing fica somente leitura para coordenador, respeitando RLS já existente).
    - `onSave` → `updateOpportunity.mutate(...)`.
    - `onDelete` → `deleteOpportunity.mutate(...)` (só dispara se não readOnly).
- Após salvar/excluir, recarregar a lista local (`load()`) além das invalidações do hook.
- Manter o restante da página (filtro por segmento, kanban agrupado por estágio, dialog de "perdido" com motivo, botão "Gerar OS") inalterado.

### 3. Escopo / não-objetivos
- Sem alterações de RLS, schema ou no fluxo do Comercial/Marketing.
- Sem mudar o card do kanban, o filtro de segmento ou a criação de OS.
- Sem trocar o kanban por `OpportunityKanban` do Comercial — apenas o modal de detalhes precisa ser idêntico.

## Resultado
Coordenador vê em `/admin/opportunities` o mesmo painel lateral rico do Comercial (abas, atividades, tarefas, produtos), com edição habilitada nas oportunidades de Serviço/Indefinido e somente-leitura nas de Comercial/Marketing.