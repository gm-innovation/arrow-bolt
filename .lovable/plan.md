## Objetivo
Criar o papel **Marketing** reutilizando o módulo Comercial existente (mesmas telas, mesmas tabelas), sem duplicar código.

## Abordagem
Marketing entra como um novo `app_role` que redireciona para `/commercial/*` e usa o mesmo `DashboardLayout` do Comercial. Nenhum módulo novo é criado.

## Passos

### 1. Banco de dados (migration)
- Adicionar valor `'marketing'` ao enum `public.app_role`.
- Revisar policies RLS que hoje liberam acesso ao Comercial (ex.: `crm_opportunities`, `crm_buyers`, `crm_tasks`, `crm_knowledge_base`, `crm_products`, `crm_sales`, `clients`, `client_contacts`, `client_addresses`, `crm_client_recurrences`, `crm_reference_documents`) e incluir `has_role(auth.uid(), 'marketing')` onde hoje há `'commercial'`.
  - Escopo: mesmas permissões do Comercial (leitura + escrita nas mesmas tabelas). Se depois quiser restringir (ex.: Marketing só lê vendas), ajustamos.

### 2. Frontend — mapeamento de papel
- `src/lib/roleRedirect.ts`: adicionar `marketing: "/commercial/dashboard"`.
- `src/components/account/AccountLayoutRoute.tsx`: mapear `marketing → "commercial"` em `roleToUserType`.
- `src/App.tsx` (ou onde estão as rotas `/commercial/*` protegidas): incluir `marketing` na lista de roles permitidos ao lado de `commercial`, `coordinator`, `manager`, `director`.
- `DashboardLayout` do Comercial: garantir que aceita o papel Marketing (mesmo menu lateral do Comercial).

### 3. Telas de gestão de usuários
Incluir a opção "Marketing" nos selects de papel:
- `src/pages/super-admin/Users.tsx`
- `src/pages/admin/Users.tsx` / `NewUser.tsx` / `EditUser.tsx`
- `src/pages/commercial/admin/Users.tsx` (constante `ROLES` e `roleLabels`)
- Qualquer outro dropdown de roles (busca rápida por `roleLabels`/`ROLES`).

### 4. Rótulo pt-BR
Adicionar `marketing: "Marketing"` em todos os mapas `roleLabels` encontrados (memória do projeto: `role-labels-mapping-pt-br`).

## Fora de escopo
- Não criar módulo/rotas `/marketing/*`.
- Não criar dashboards, KPIs ou telas específicas de Marketing agora.
- Não mexer em permissões de outros módulos (HR, Financeiro, Qualidade etc.) — Marketing não terá acesso a eles.

## Perguntas antes de implementar
1. **Permissões idênticas ao Comercial?** Marketing terá exatamente o mesmo acesso (criar/editar oportunidades, clientes, produtos, vendas, tarefas, base de conhecimento)? Ou quer restringir algo (ex.: só leitura em Vendas/Sales)?
2. **Quem pode criar usuário Marketing?** Igual ao Comercial hoje (Super Admin, Coordenador, Diretor, RH)?
