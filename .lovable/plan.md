# Plano — Popular a Opportunity Solution Tree com o que já temos

A árvore está vazia hoje, mas o sistema já possui sinais suficientes para gerar uma primeira versão útil, sem inventar dados: **North Star Metrics**, **support_tickets** (~24 abertos, com `category`, `impacted_module`, `rice_score` e itens de roadmap) e o próprio **backlog do roadmap** (que hoje vive dentro de `support_tickets` prefixados com `[Roadmap]`).

## O que semear (mapeamento direto a partir dos dados reais)

Estrutura padrão da OST: `outcome → opportunity → solution → experiment`.

1. **Outcomes (raízes)** — 1 por North Star Metric ativo em `pm_north_star_metrics`. Título = nome da métrica, `north_star_metric_id` vinculado. Se não houver NSM, criar 3 outcomes padrão a partir dos módulos com mais tickets abertos (Plataforma, RH, IA, PM) — apenas como fallback.

2. **Opportunities (nível 2)** — 1 por `impacted_module` distinto dos tickets abertos/in_progress. Exemplos reais que aparecem hoje: RH, IA, PM, SGQ, CRM, Financeiro, Universidade, Notificações, Integrações, Corporativo, Plataforma, AI_Copilot, Product Health Dashboard, HR, Recursos Humanos. Consolidar sinônimos (`RH`/`HR`/`Recursos Humanos` → RH; `IA`/`AI_Copilot` → IA). Descrição = contagem de tickets + categorias.

3. **Solutions (nível 3)** — 1 por ticket `category = 'feature_request'` aberto/in_progress, filho da opportunity do seu módulo. Título = título do ticket (removendo o prefixo `[Roadmap] `). Descrição = descrição do ticket. Já cria vínculo em `pm_ticket_ost_links`.

4. **Experiments** — não gerar automaticamente nesta primeira passada; ficam para o usuário/Marina adicionarem quando um solution virar teste.

Não migrar bugs para a OST (bugs não pertencem à árvore de descoberta) — o único bug atual (`Recursos Humanos`) fica apenas ligado por `pm_ticket_ost_links` à opportunity RH, sem virar nó.

## Como o usuário controla

- Botão **"Sugerir a partir de tickets/métricas"** no card da OST em `/super-admin/pm-dashboard` (aba Estratégia). Abre um dialog de pré-visualização listando outcomes/opportunities/solutions que serão criados, com checkboxes para desmarcar itens. Só grava após confirmação — nada é criado silenciosamente.
- Idempotência: antes de inserir, deduplica por `(node_type, title, parent_id)`. Rodar de novo não gera duplicatas; apenas adiciona o que faltar.
- Cada nó criado vira também um evento em `pm_activity_log` (já coberto pelo trigger existente).

## Marina — reforço opcional (mesmo turno)

Adicionar ferramenta `suggest_ost_from_signals` na Edge Function `ai-assistant` (só `super_admin`): lê NSMs + tickets abertos e propõe no chat a mesma lista, aplicando via `create_ost_node` (já implícita através de `pm_ost_nodes`) após confirmação textual. Isso responde ao roadmap item já existente "pm-insights-suggest — Marina propõe OST".

## Entregáveis técnicos

- Edge Function nova `pm-ost-seed` (POST): monta o preview (dry-run por padrão) e aplica quando `apply: true`. Regras acima. Retorna JSON com contagens.
- Hook `useOSTSeed` em `src/hooks/usePMDashboard.ts` + dialog `OSTSeedDialog.tsx`.
- Botão "Sugerir a partir de sinais" ao lado do "+ Novo nó" em `StrategyTab` (`PMDashboard.tsx`).
- Ferramenta `suggest_ost_from_signals` em `supabase/functions/ai-assistant/tools.ts` + registro no prompt em `index.ts`.
- Sem migração de schema — a estrutura de `pm_ost_nodes` e `pm_ticket_ost_links` já suporta tudo.

## Fora de escopo

- Auto-scoring RICE de nós OST (já existe em tickets; pode ser puxado por join na UI depois).
- Geração automática de experiments.
- Movimentação/reordenação drag&drop dentro da OST (a UI atual já lista; reordenação fica para depois).
