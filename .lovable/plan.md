## Objetivo

1. **Histórico** deixa de mostrar apenas tickets resolvidos e passa a ser um timeline unificado de **tudo que mudou no sistema** — inclusive o que foi feito antes da criação dos tickets/roadmap.
2. **Marina**, ao conversar com o super_admin, gera **prompts prontos para o Lovable** (criar/corrigir ferramentas ou funções) diretamente no chat, sem precisar abrir um ticket antes.

---

## Parte 1 — Histórico unificado ("tudo que fazemos")

### Fontes de dados a consolidar

O histórico deixará de ler só `support_tickets` resolvidos e passará a agregar, por data:

| Origem | O que representa | Como entra no timeline |
|---|---|---|
| `support_tickets` (resolved/closed) | Bugs/melhorias/features fechadas | Igual hoje |
| `pm_changelog` | Versões publicadas | Cabeçalho de bloco |
| `supabase_migrations.schema_migrations` (via RPC) | Toda migração já aplicada no banco desde o início | Item "Migração aplicada" com nome/versão |
| `ai_assistant_actions` (status=`applied`) | Ações que a Marina executou (criar/mover ticket, publicar versão, criar métrica, etc.) | Item "Ação da Marina" |
| Deploys de Edge Functions (últimos N via `supabase functions list` / registro local) | Funções publicadas | Item "Função publicada" |

Para trazer o histórico "desde a mais antiga recordação", crio uma **tabela de sistema única** `pm_activity_log` que é **populada retroativamente** por migração a partir das fontes acima e depois **atualizada continuamente** por triggers/edge:

```sql
create table public.pm_activity_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null,
  source text not null check (source in ('ticket','changelog','migration','marina_action','edge_function','manual')),
  category text,           -- bug|feature|improvement|infra|ai|content
  module text,              -- RH, CRM, OS, SGQ, PM, IA, Auth, Infra...
  title text not null,
  description text,
  ref_table text,           -- ex: 'support_tickets'
  ref_id text,              -- id/número/versão de referência
  author_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
-- RLS: SELECT para super_admin/director; INSERT via SECURITY DEFINER
```

**Backfill (uma vez, na própria migração):**
- Insere um registro por linha de `pm_changelog`.
- Insere um registro por linha de `supabase_migrations.schema_migrations` (usando o timestamp do nome do arquivo como `occurred_at`) — assim aparece todo o histórico técnico "desde o início".
- Insere um registro por `support_tickets` com `resolved_at not null`.
- Insere um registro por `ai_assistant_actions` já executada.

**Continuidade:**
- Trigger `AFTER INSERT/UPDATE` em `support_tickets` (quando vira resolved) → grava em `pm_activity_log`.
- Trigger em `pm_changelog` → grava versão.
- Trigger em `ai_assistant_actions` (status muda para `applied`) → grava ação.
- Migrações futuras: hook simples numa Edge Function `log-migration` chamada manualmente, **ou** registro periódico via um cron que compara `schema_migrations` com o que já está em `pm_activity_log` (para não depender de intervenção manual).

### UI (`PMHistoryTab.tsx`)

- Passa a consumir um novo hook `useActivityLog(filters)` no lugar de `usePMTickets().filter(resolved)`.
- Filtros: **Origem** (Tickets / Versões / Migrações / Marina / Edge functions / Tudo), **Tipo**, **Módulo**, período.
- Agrupamento continua por **versão publicada** quando o item estiver vinculado; caso contrário, por **semana** — agora abraçando todas as origens.
- Cada item mostra ícone da origem (Tag, Package, Database, Sparkles, Cloud), título, módulo e data. Clique abre:
  - Ticket → `TicketDetailDialog` (comportamento atual).
  - Versão → detalhes do changelog.
  - Migração / Marina / Edge → dialog somente-leitura com o `description` + `metadata`.
- Botão "Publicar versão" continua funcionando, mas agora pode incluir também itens de origem `marina_action` e `migration` (opcional) na composição da nota de versão.

---

## Parte 2 — Marina gera prompts dev direto no chat

Hoje o "prompt para Lovable" só é gerado a partir de um ticket existente pela função `generate-ticket-dev-prompt`. Vamos permitir que a Marina produza esse prompt **durante uma conversa**, com ou sem ticket.

### Nova ferramenta no agente (`supabase/functions/ai-assistant/tools.ts`)

Adicionar ferramenta `generate_dev_prompt` disponível para papéis com escrita PM (super_admin/director):

```
generate_dev_prompt({
  title: string,
  problem_or_goal: string,
  type: 'bug' | 'feature' | 'improvement',
  module?: string,
  context?: string,     // rota, arquivo, comportamento observado
  create_roadmap_item?: boolean   // default false
}) -> { prompt: string, ticket_id?: string }
```

Comportamento:
1. Monta o payload no mesmo formato usado hoje pela função `generate-ticket-dev-prompt` e a invoca (reaproveita a lógica de geração já validada com Gemini).
2. Se `create_roadmap_item = true`, cria um `support_tickets` na coluna **Gelo** (respeita o trigger existente `trg_support_ticket_auto_roadmap`), grava o prompt em `dev_prompt` e devolve o `ticket_id` — permitindo arrastar depois no board.
3. Retorna o prompt final em texto para a Marina responder no chat.

### Prompt de sistema da Marina (super_admin)

Ampliar as instruções de PM da Marina para: "Quando o usuário descrever uma nova funcionalidade, um bug, ou uma melhoria, ofereça imediatamente gerar um **Prompt para Lovable** via `generate_dev_prompt`. Pergunte se deseja também registrar no Roadmap (Gelo)."

### UI do chat

- Quando a resposta da Marina contém um prompt gerado (marcador `[[dev_prompt]]` no metadata da mensagem ou `tool_result` com `prompt`), o `MessageBubble` renderiza um **card destacado** com:
  - Botão **Copiar prompt**.
  - Botão **Criar item no Roadmap (Gelo)** se ainda não foi criado.
  - Link **Abrir ticket** se `ticket_id` retornou.

Sem mudanças no layout base do chat — apenas um bloco extra reutilizando o padrão dos "Sugestões contextuais".

---

## Detalhes técnicos

**Novos arquivos**
- `supabase/migrations/<ts>_pm_activity_log.sql` — tabela + RLS + triggers + backfill (tickets, changelog, migrations, marina_actions).
- `src/hooks/usePMActivityLog.ts` — consulta com filtros; usada pelo Histórico.
- `src/pages/super-admin/PMHistoryTab.tsx` — refatoração para consumir o novo hook e renderizar itens multi-origem.
- `supabase/functions/ai-assistant/tools.ts` — adicionar `generate_dev_prompt` (chama internamente `generate-ticket-dev-prompt`).
- `src/components/super-admin/ai/DevPromptCard.tsx` — bloco de UI para prompts no chat.
- Ajuste em `MessageBubble`/renderer do chat da Marina para reconhecer o payload da nova ferramenta.

**Sem mudanças destrutivas**
- `support_tickets` mantém seu papel; o log é aditivo.
- `pm_changelog` continua sendo a fonte oficial de versões.

**Riscos / observações**
- Ler `supabase_migrations.schema_migrations` exige uma RPC `SECURITY DEFINER` (schema `public`) que devolva `version, name, statements_hash`. Simples e read-only.
- Volume: alguns milhares de linhas totais no backfill — sem impacto de performance.
- O botão "Publicar versão" continua contando somente `support_tickets` sem versão (não muda o fluxo comercial de release notes).