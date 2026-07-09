
# Revisão e testes do módulo Comercial/Marketing

Objetivo: validar, de ponta a ponta, que todas as telas, hooks, permissões e integrações do módulo comercial (incluindo o novo papel `marketing`) estão funcionando, sem regressões após as últimas mudanças (combobox de clientes, view `crm_client_options`, remoção de funcionários, novo papel Marketing, etc.).

## 1. Escopo da auditoria

**Páginas cobertas** (`src/pages/commercial/*` + `src/pages/admin/Opportunities.tsx`):
- Dashboard, Clientes, Compradores, Oportunidades, Produtos, Vendas (CRM), Tarefas, Recorrências, Medições, Base de Conhecimento, Relatórios, Perfil, Configurações
- Admin › Oportunidades de Serviço (compartilha componentes)

**Hooks/serviços críticos:**
- `useCommercialClientOptions`, `useBuyers`, `useOpportunities`, `useOpportunityProducts`, `useOpportunityTransfers`, `useCrmSales`, `useCommercialTasks`, `useProducts`, `useRecurrences`, `useClientContacts`, `useClientAddresses`, `useClientLegalEntities`, `useClientAnalytics`, `useKnowledgeBase`, `useCommercialStats`, `usePartyTreatments`.

**Componentes compartilhados:**
- `ClientSearchCombobox`, `NewOpportunityDialog`, `EditOpportunitySheet`, diálogos de vendas, tarefas e recorrências.

## 2. Checklist funcional (por página)

Para cada página verificar: carregamento, filtros, criação, edição, exclusão, permissões (`comercial`, `marketing`, `admin`, `director`), estado vazio, paginação/scroll, e sincronização de estado após mutação (padrão do bug SIPOC — `useState` inicializado de query assíncrona).

- **Clientes**: busca, dossiê (5 abas), Omie sync, `crm_visible`, criação/edição sem colidir com funcionários.
- **Compradores**: vínculo com cliente, contato primário automático.
- **Oportunidades**: pipeline, drag/troca de etapa, combobox de cliente dentro do Sheet (regressão recente), transferência, produtos vinculados, motivo de perda, geração de OS.
- **Vendas (CRM)**: itens, baixa de estoque, status.
- **Tarefas**: CRUD, filtros, categorias.
- **Recorrências**: geração de oportunidades a partir de templates, lead time.
- **Produtos**: CRUD, estoque.
- **Medições / Relatórios / KB / Dashboard**: leituras, agregações, exportações.
- **Perfil / Configurações**: edição própria.

## 3. Auditoria técnica transversal

- **Papel `marketing`**: confirmar rotas (`App.tsx`), sidebar, permissões RLS (leitura/escrita nas tabelas CRM), aparição em seletores de responsável.
- **Fonte de clientes**: garantir que todos os seletores comerciais usam `crm_client_options` (view) — nenhuma consulta residual em `clients` direto.
- **Padrão SIPOC-like**: varrer diálogos comerciais em busca de `useState` inicializado com dado assíncrono sem `useEffect` de sincronização (ex.: edição de oportunidade, edição de venda, edição de tarefa, recorrência).
- **RLS**: rodar `supabase--linter` e queries de sanidade nas tabelas `crm_*` para checar policies e grants.
- **Console/network**: coletar erros durante navegação Playwright.

## 4. Estratégia de teste

1. **Estático**: leitura em paralelo de páginas e hooks; grep por anti-padrões (`from("clients")` fora da view, `useState(...)` dependente de query sem effect).
2. **Banco**: `supabase--read_query` para conferir integridade (funcionários fora de `clients`, oportunidades órfãs, buyers sem client, papel `marketing` presente em `user_roles`).
3. **Runtime (Playwright headless em `localhost:8080`)** com sessão do usuário atual:
   - Login → percorrer cada rota comercial, tirar screenshot, capturar console errors e requests com status ≥ 400.
   - Fluxos-chave: criar cliente → criar comprador → criar oportunidade (validando combobox no Sheet) → mover etapa → gerar OS; criar tarefa; criar venda com item.
4. **Relatório**: tabela por página com Status (OK / Warning / Bug), evidência (screenshot + trecho de log) e proposta de correção priorizada.

## 5. Entregáveis

- Relatório em Markdown com achados organizados por severidade.
- Lista priorizada de correções (sem aplicá-las nesta rodada — só após sua aprovação).
- Se surgirem bugs bloqueantes durante a auditoria, pausar e trazer para decisão antes de seguir testando.

## 6. Fora de escopo

- Módulo de Qualidade, RH, Suprimentos, Financeiro (só se aparecerem como dependências diretas do Comercial).
- Novas features — apenas verificação do existente.

## Detalhes técnicos

- Ferramentas: `code--view`, `rg`, `supabase--read_query`, `supabase--linter`, Playwright via shell (viewport 1280×1800, sessão Supabase injetada em `localStorage`).
- Artefatos: `/tmp/browser/commercial-audit/screenshots/*.png` + `report.md`.
- Duração estimada: 1 rodada longa de exploração antes de propor as correções.
