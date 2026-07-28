## Objetivo

Configurar a Marina para o perfil **super_admin** com comportamento próprio, e dar a ela ferramentas para inserir/mover itens no Roadmap, registrar changelog, métricas e nós de OST — para que você possa conversar sobre novas funcionalidades e ela alimente o Dashboard de PM.

## 1) Habilitar `super_admin` no painel "AI Management"

Hoje o array `ROLES` em `BehaviorTab.tsx` não inclui `super_admin`, então não há campo para você digitar instruções específicas.

- `src/components/super-admin/ai/BehaviorTab.tsx`: adicionar `super_admin` ao `ROLES` (topo da lista), com placeholder específico ("Instruções quando o usuário for Super Admin — foco em PM, roadmap, changelog…").
- Mesma inclusão em qualquer outro seletor de role que hoje omita `super_admin` (Guardrails/Aparência se aplicável).

## 2) Seed do agente Marina para super_admin

Migração `insert` (não schema) na linha do agente `is_default = true, company_id IS NULL`:

- `behavior.role_instructions.super_admin`: prompt orientando a Marina a agir como copiloto de PM — pode listar tickets do roadmap, propor novo item (chama `create_roadmap_item`), mover entre horizontes, resumir métricas de saúde, sugerir defesa/prompt de dev, e registrar entrada de changelog quando pedido.
- `behavior.suggested_prompts`: acrescentar prompts contextuais para super admin ("Adicione ao Gelo a ideia X", "Mova o ticket #NN para Próximo", "Publique versão 1.4 com estes itens", "Resuma o backlog por módulo").
- `scope.write_actions`: habilitar `create/update` para os módulos novos abaixo (`roadmap_items`, `pm_changelog`, `pm_north_star_metrics`, `pm_ost_nodes`).

## 3) Novas ferramentas na edge function (super_admin)

Editar `supabase/functions/ai-assistant/tools.ts`:

- Novo `Module` `roadmap` (com `pm_changelog`, `pm_metrics`, `pm_ost` como submódulos ou tools separadas).
- Restringir por role: só entram no catálogo quando `role === "super_admin"`.
- Tools SELECT (leitura):
  - `query_roadmap_items` → `support_tickets` onde `category IN ('feature_request','improvement','suggestion')` ou `roadmap_horizon IS NOT NULL`, com filtros `horizon`, `module`, `search`.
  - `query_pm_changelog`, `query_pm_metrics`, `query_pm_ost_nodes`.
- Tools de escrita (com auditoria em `ai_assistant_actions` como as demais):
  - `create_roadmap_item({title, description, module, horizon='icebox', rationale?})` → insere em `support_tickets` já com prefixo `[Roadmap]`, `category='feature_request'`, `roadmap_horizon`, `created_by = ctx.userId`.
  - `move_roadmap_item({ticket_id, horizon, position?})` → update de `roadmap_horizon` e `roadmap_position`.
  - `set_roadmap_rationale({ticket_id, rationale})` → grava `rice_rationale`.
  - `generate_roadmap_dev_prompt({ticket_id})` → chama a edge `generate-ticket-dev-prompt` existente (via fetch service-role) e retorna o prompt salvo.
  - `publish_pm_version({version, notes, ticket_ids[]})` → insere em `pm_changelog` e vincula tickets (`pm_changelog_id`, marca `status='resolved'`).
  - `upsert_north_star_metric({...})` e `create_ost_node({...})` — leitura obrigatória, escrita opcional (deixar somente se o usuário confirmar mais tarde; por ora entregar leitura + roadmap writes).

Todas as writes passam pelo mesmo pipeline de `write_actions` já existente, então respeitam o toggle na aba "Ações de Escrita".

## 4) UI de "Ações de Escrita" e "Escopo"

- `src/components/super-admin/ai/WriteActionsTab.tsx`: adicionar grupo **PM / Roadmap** com linhas `roadmap_items`, `pm_changelog`, `pm_north_star_metrics`, `pm_ost_nodes` — ligado ao mesmo `scope.write_actions` do agente.
- Nenhuma mudança no schema; só nomes de "tabela lógica" que o tool loop já usa como chave.

## 5) Contexto de página

`AIAssistant` já envia `context.currentScreen`. Ao entrar em `/super-admin/pm-dashboard`, o `AIChat` deve mandar `context.pageUrl` (já manda) — a Marina usa isso no prompt "Você está no Dashboard de PM" para priorizar as tools de roadmap. Ajustar apenas o system prompt no edge para acrescentar essa dica quando `pageUrl` contém `/super-admin/pm-dashboard`.

## Verificação

1. Abrir `/super-admin/ai-management` → aba **Comportamento**: campo "super_admin" visível e editável.
2. Aba **Ações de Escrita**: grupo PM / Roadmap listado com toggles.
3. Abrir chat da Marina como super_admin e testar:
   - "Adicione ao Gelo: Central de novidades v2, módulo pm" → aparece novo card em Gelo no `/super-admin/pm-dashboard`.
   - "Mova o ticket #1010 para Próximo" → card muda de coluna.
   - "Publique a versão 1.4 com os tickets X, Y" → entrada em `pm_changelog` e tickets vinculados.
4. Rodar a migration/insert do seed do agente e confirmar que `behavior.role_instructions.super_admin` está gravado.

## Detalhes técnicos

- Escritas usam `userSupabase` (JWT do super_admin) para respeitar RLS — políticas de `support_tickets` e `pm_changelog` já permitem super_admin.
- Auditoria: cada write registra em `ai_assistant_actions` (tabela existente).
- Sem novas migrations de schema; apenas um `insert/update` no agente default e código nas tools + UI.
