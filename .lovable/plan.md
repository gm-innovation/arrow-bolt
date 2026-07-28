# Histórico do sistema — legibilidade + cobertura total de alterações

## Diagnóstico

Consultei `pm_activity_log`: **os 278 itens são todos `source=migration`**. Duas causas:

1. **Migrações têm nomes técnicos** (hash). Precisamos extrair descrição legível do SQL real em `supabase_migrations.schema_migrations.statements`.
2. **Cobertura insuficiente**: os triggers atuais só logam ticket **resolvido** e changelog **publicado**. Toda outra alteração — criar ticket, editar título/descrição, mover no roadmap, mudar prioridade/RICE, gerar dev_prompt, ações da Marina — não estava sendo registrada. É isso que você acabou de apontar.

## O que fazer

### 1. Cobertura total: qualquer alteração gera log

Nova migração cria triggers de log em cada evento relevante, sem depender do status do ticket:

- **`support_tickets` (AFTER INSERT/UPDATE/DELETE)** — um trigger só, que decide o texto:
  - INSERT → "Ticket criado: {título}"
  - UPDATE de `status` → "Status: {old} → {new}"
  - UPDATE de `roadmap_horizon` → "Roadmap: {old} → {new}" (captura o drag & drop)
  - UPDATE de `priority`/`reach`/`impact`/`confidence`/`effort`/`rice_score` → "RICE atualizado (score {n})"
  - UPDATE de `dev_prompt` (de vazio p/ preenchido) → "Prompt para Lovable gerado"
  - UPDATE de `title`/`description`/`rice_rationale` → "Ticket editado: {campo}"
  - DELETE → "Ticket removido: {título}"
  - Cada evento vira uma linha própria em `pm_activity_log` com `source='ticket'`, `ref_id=ticket.id`, `metadata` guardando o diff bruto.

- **`pm_changelog` (AFTER INSERT/UPDATE)** — logar publicação e edições da versão.

- **`ai_assistant_actions` (AFTER INSERT)** — logar toda ação executada pela Marina (create_roadmap_item, move_roadmap_item, generate_dev_prompt, publish_pm_version, etc.) com `source='marina_action'`.

- **`pm_north_star_metrics` / `pm_ost_nodes`** — INSERT/UPDATE também logam, para capturar quando métricas/OST forem editadas.

Todos os triggers rodam em `SECURITY DEFINER` e nunca falham a operação principal (bloco `EXCEPTION WHEN OTHERS THEN NULL`).

### 2. Migrações legíveis (backfill + on-insert)

Criar função SQL `pm_summarize_migration(statements text[]) → jsonb` que percorre o SQL e devolve:
- **title**: primeira operação DDL relevante, ex.: `CREATE TABLE public.pm_activity_log`, `ALTER TABLE support_tickets: +roadmap_position, +pm_changelog_id`, `CREATE POLICY em storage.objects (ai-knowledge)`, `CREATE TRIGGER trg_pm_log_ticket`.
- **description**: contagem: "3 CREATE TABLE, 5 ALTER TABLE, 12 CREATE POLICY, 2 CREATE FUNCTION".
- **module**: derivado dos nomes de tabela (`pm_*`→PM, `hr_*`→RH, `quality_*`→SGQ, `crm_*`→CRM, `ai_*`→IA, `support_*`→PM, etc.).
- **objects**: lista de tabelas/funções tocadas (para chips no acordeão).

Parser por regex: `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `CREATE POLICY`, `CREATE FUNCTION`, `CREATE TRIGGER`, `CREATE INDEX`, `INSERT INTO`, `UPDATE`, `GRANT`, `CREATE TYPE`.

Aplicação:
- **Backfill**: `UPDATE pm_activity_log` nos 278 itens de migração populando `title`/`description`/`module`/`metadata.objects`.
- **Trigger de novas migrações**: passa a chamar a função — novas entradas já entram legíveis.

### 3. UI: mostrar o resumo, esconder o hash

`src/pages/super-admin/PMHistoryTab.tsx`:
- Título grande = `title` legível (para tickets: "Ticket #12 — Status: open → in_progress"; para migrações: `CREATE TABLE pm_activity_log`).
- Subtítulo muted = versão técnica (`20260728141301`) só como referência.
- Acordeão expansível: chips de objetos/campos afetados; para migrações, `<pre>` com SQL bruto (limitado a ~2 KB); para tickets, o diff.
- Filtros atuais (origem, módulo, busca) continuam. Busca casa contra `title` novo e `metadata.objects`.
- Novas origens (`ticket` editado, `marina_action`) aparecem naturalmente pelos filtros.

## Detalhes técnicos

Arquivos afetados:
- **1 migração**: função `pm_summarize_migration`, backfill, novos triggers (`support_tickets`, `pm_changelog`, `ai_assistant_actions`, `pm_north_star_metrics`, `pm_ost_nodes`), ajuste do trigger de migrações para usar a função de resumo.
- `src/pages/super-admin/PMHistoryTab.tsx`: renderização enxuta com título legível + expansão de detalhes.
- `src/hooks/usePMActivityLog.ts`: expor `metadata.objects` e `metadata.sql_preview` no shape retornado (se ainda não estiver).

Sem novas tabelas, sem novas edge functions, sem alterar RLS.

## Fora de escopo

- Não reescrever agrupamento por semana/versão.
- Não usar IA para descrever migrações — o parser SQL é suficiente e determinístico. Uma ação "explicar com Marina" por item pode ser adicionada depois.
