# Responsável visível no CRM e menu organizado

## O problema (verificado no código)

1. **Não há onde ver o responsável.** A tabela de Leads do Site (`SiteLeadsTab`) mostra Quando, Tipo, Empresa/Contato, Contato, Status e Ações — nenhuma coluna de responsável, e o hook `useSiteLeads` faz `select("*")` sem trazer o nome da pessoa. O detalhe do lead também não mostra nem permite trocar responsável. Ou seja, a Marina gravou a atribuição, mas a tela não tem como exibi-la.
2. **O card da oportunidade não mostra responsável.** `OpportunityCard` não renderiza o nome do responsável (o dado existe: `useOpportunities` já traz `profiles:assigned_to (full_name)`). Só aparece ao abrir a edição.
3. **A lista de clientes não mostra responsável.** `ClientsTable` não tem essa coluna.
4. **O menu não tem "CRM".** O menu do Comercial é uma lista plana (Dashboard, Clientes, Oportunidades, Tarefas, Compradores, Produtos, Recorrências, Vendas, Relatórios, Conhecimento, Inteligência, Notificações, Admin, Configurações, Feed, Solicitações). A Marina disse "Menu lateral → CRM → Oportunidades" — caminho que não existe — e ainda respondeu com asteriscos de Markdown.

## O que será feito

### 1. Responsável visível e editável nos Leads do Site
- Nova coluna "Responsável" na tabela de leads, com o nome da pessoa (ou "Não atribuído").
- Troca do responsável direto na linha e também no detalhe do lead, por seleção de colega da empresa.
- Filtro rápido "Meus leads / Todos" para o comercial ver o que é dele.
- Atualização imediata da lista após a troca.

### 2. Responsável visível nas Oportunidades
- Nome do responsável no card do Kanban (avatar/iniciais + nome curto).
- Coluna/linha de responsável no detalhe da oportunidade, já editável como hoje.

### 3. Responsável na lista de Clientes
- Coluna "Responsável" na tabela de clientes, exibindo quem responde pela conta.

### 4. Menu lateral organizado com grupo CRM
- Agrupar o menu do Comercial em seções colapsáveis (o layout já suporta grupos):
  - CRM: Dashboard, Leads & Oportunidades, Clientes, Compradores, Tarefas, Vendas, Recorrências
  - Catálogo: Produtos
  - Análise: Relatórios, Inteligência (IA), Conhecimento
  - Corporativo: Feed, Solicitações, Notificações
  - Sistema: Admin, Configurações
- Assim o caminho que a Marina indica ("CRM → Oportunidades") passa a existir de verdade.

### 5. Marina orientando o caminho certo
- Corrigir a regra de orientação para usar texto limpo (sem asteriscos e sem crases) e os rótulos reais do menu, incluindo o grupo.
- Ao confirmar uma atribuição, a Marina passa a dizer onde conferir com o caminho exato ("CRM → Leads & Oportunidades, aba Leads do Site, coluna Responsável").

## Validação
- Atribuir a Belga Marine a alguém pela Marina e ver o nome aparecendo na coluna Responsável dos Leads do Site sem recarregar.
- Trocar o responsável direto na linha do lead e no detalhe.
- Ver o responsável no card do Kanban e na lista de clientes.
- Menu do Comercial com grupo CRM aberto na rota atual.

## Detalhes técnicos
- `src/hooks/useSiteLeads.ts`: incluir `assigned_to` + join do nome do responsável (via `profiles`/RPC pública já usada no projeto, respeitando a proteção de PII de `profiles`), e mutação `setAssignee`.
- `src/components/commercial/opportunities/SiteLeadsTab.tsx` e `LeadDetailsDialog.tsx`: coluna Responsável, seletor de colega, filtro "meus leads".
- `src/components/commercial/opportunities/OpportunityCard.tsx`: exibir `profiles.full_name`.
- `src/components/commercial/clients/ClientsTable.tsx`: coluna Responsável.
- `src/components/DashboardLayout.tsx`: converter o array plano do `commercial` em grupos (padrão já usado em Qualidade).
- `supabase/functions/ai-assistant/index.ts`: regra S3 sem Markdown e com o novo caminho de menu.
