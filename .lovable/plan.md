## Aba "IA & Impacto" — enriquecimento com dados reais

Hoje a aba mostra quase tudo zerado por três motivos concretos:

1. `useAIPerformance` filtra `ai_assistant_actions.status`, mas a coluna real é `success boolean` → "Ações executadas" e "Ações falhas" ficam sempre em 0.
2. A janela é fixa em 30d — só 4 mensagens caem aí. Existem **76 mensagens** desde dez/2025 e **20 conversas** que nunca aparecem.
3. `pm_changelog` está vazio, mas o `pm_activity_log` tem **326 eventos** (migrations, tickets, roadmap, ações da Marina) que podem semear releases automaticamente. `support_tickets` tem 24 registros (23 feature_requests, 1 bug) prontos para vincular a releases.

### O que vamos fazer (somente frontend + hooks + 1 edge function de seed)

**1. Corrigir e ampliar `useAIPerformance` (`src/hooks/usePMDashboard.ts`)**
- Trocar `status` por `success` (fix do bug de 0 ações).
- Aceitar janela `30d | 90d | all` e devolver, além do que já tem:
  - `totalConversations` (de `ai_conversations`)
  - `uniqueUsers` (distinct `user_id` em `ai_messages`)
  - `messagesByDay` (série para gráfico)
  - `topTools` (top 8 `tool_name` de `ai_assistant_actions` com taxa de sucesso)
  - `messagesByAgent` (join com `ai_agents.name`)
  - `feedbackByAgent`

**2. Reformular o bloco "Performance da IA" no `ImpactTab` (`src/pages/super-admin/PMDashboard.tsx`)**
- Toggle 30d / 90d / Todo o período no topo do card.
- Nova linha de KPIs: Conversas, Usuários únicos, Mensagens, Ações OK, Taxa de sucesso das ações, Feedback +/−.
- Mini-gráfico de área "Mensagens IA por dia" (recharts, já usado no projeto).
- Tabela "Top ferramentas usadas pela Marina" com contagem e % sucesso.
- Chips "Mensagens por agente".

**3. Auto-popular o Changelog de Impacto a partir do histórico existente**
- Nova edge function `pm-changelog-seed` que:
  - Lê `pm_activity_log` do tipo `migration` (agrupadas por dia, título já amigável via `pm_summarize_migration`), das últimas ~180d.
  - Cria entradas em `pm_changelog` (uma por dia com migrations), preenchendo `title`, `description` (bullets das migrations do dia), `released_at`, `impacted_modules` (deduzidos dos títulos), `related_ticket_ids` (tickets fechados/atualizados no mesmo dia).
  - Idempotente: ignora dias que já têm entrada com o mesmo título/data.
- Botão **"Sincronizar do histórico"** no header do card "Changelog de Impacto" chamando essa função + toast com "N entradas criadas".
- Cada entrada da lista passa a mostrar: versão (se houver), badges de módulos impactados e nº de tickets vinculados.

**4. Vincular releases às métricas**
- Ao abrir/editar uma entrada, se `north_star_metric_id` estiver setado e `metric_before/after` vazios, pré-preencher `metric_before` com o valor atual da NSM no momento da release e destacar delta.

**5. Detalhes de UX**
- Estados vazios explicando o próximo passo ("Sem feedback ainda — a Marina passa a coletar automaticamente após avaliações 👍/👎").
- Skeletons quando `all-time` demorar.

### Fora de escopo (não mexer neste ciclo)
- Nenhuma mudança em RLS, schema (exceto a edge function) ou em outras abas do dashboard.
- Sem novas tabelas — reutilizamos `ai_messages`, `ai_conversations`, `ai_assistant_actions`, `ai_feedback`, `pm_activity_log`, `pm_changelog`, `pm_north_star_metrics`.

### Arquivos que serão tocados
- `src/hooks/usePMDashboard.ts` — expandir `useAIPerformance` + novo `useSeedChangelog`.
- `src/pages/super-admin/PMDashboard.tsx` — reescrever `ImpactTab`.
- `supabase/functions/pm-changelog-seed/index.ts` — nova função (verify_jwt padrão).

### Detalhes técnicos
- `ai_assistant_actions.success bool`: `executed = success = true`, `failed = success = false`.
- Janela "all": sem filtro de data; usar `count: 'exact', head: true` para KPIs grandes; paginar `ai_messages` por dia via RPC leve ou reduzir client-side (76 linhas hoje, cresce devagar).
- Módulos impactados no seed: regex nos títulos de migration (`^adicionar|criar|atualizar (\w+)`) + mapa manual (`quality_* → SGQ`, `hr_*|profiles → RH`, `crm_*|leads → Comercial`, `service_orders|measurements → OS`, `pm_*|support_tickets → PM`, `ai_* → IA`).