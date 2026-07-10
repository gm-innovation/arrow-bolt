
## Objetivo

Eliminar os dois cards grandes (“Últimos leads” e “Oportunidades em aberto”) do dashboard do coordenador e unificar as telas `/admin/leads` e `/admin/opportunities` em uma única página no padrão do Comercial/Marketing (Kanban com aba “Leads do Site” + coluna virtual de leads).

## Alterações

### 1. Dashboard do coordenador
- `src/components/admin/dashboard/CrmDashboardCards.tsx`: remover o bloco `<div grid lg:grid-cols-2>` das linhas 93–157 (os dois cards). Mantém apenas os 4 KPIs clicáveis já refatorados.

### 2. Unificação Leads ↔ Oportunidades
- `src/pages/admin/Opportunities.tsx`: substituir o conteúdo por um wrapper que renderiza a mesma página `CommercialOpportunities` (de `src/pages/commercial/Opportunities.tsx`), garantindo:
  - Kanban com coluna virtual “Leads do site”.
  - Aba “Leads do Site” (tabela completa).
  - Modal de detalhes de lead e diálogo de conversão (`ConvertLeadDialog`) já existentes.
  - Filtro por segmento `service` para respeitar o escopo do coordenador (via prop `segmentScope="service"` a ser aceita pela página comercial; se hoje a página não aceitar, adiciono a prop opcional com default `undefined` e aplico o filtro em `openLeads`/`opportunities`).
- `src/App.tsx`: rota `/admin/leads` passa a **redirecionar** para `/admin/opportunities?tab=leads` (evita quebrar links salvos e o botão “Ver na aba de Leads” dos KPIs). Mantém `AdminLeads` importado só se ainda houver uso; caso contrário, remove o import.

### 3. Sidebar do coordenador
- `src/components/DashboardLayout.tsx` (linhas 172–173): remover o item “Leads”. Renomear “Oportunidades” para “Leads & Oportunidades” apontando para `/admin/opportunities`.

### 4. Ajustes finos nos KPIs do dashboard
- `CrmDashboardCards.tsx`: os 4 cards já linkam para `/admin/leads?status=...`. Como a rota agora redireciona para a aba de leads unificada, funciona. Ajustar o texto de rodapé “Ver na aba de Leads” para “Abrir na aba de Leads”.

## Fora de escopo
- Não altero a página `/admin/leads` original (`src/pages/admin/Leads.tsx`) — passa a ficar órfã e pode ser removida em um passo futuro após confirmar que nada mais a referencia.
- Sem mudanças de RLS: `useSiteLeads` e `useOpportunities` já são compartilhados com o Comercial.

## Validação
- Dashboard: só os 4 KPIs finos, sem os dois blocos grandes.
- `/admin/opportunities`: Kanban idêntico ao Comercial, com coluna “Leads do site” e aba “Leads do Site”.
- `/admin/leads` (ou clique nos KPIs): abre `/admin/opportunities?tab=leads` diretamente.
- Menu lateral: apenas um item “Leads & Oportunidades”.
