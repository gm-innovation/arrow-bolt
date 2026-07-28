
# Reorientar o PM Dashboard para métricas de produto

## Correção de rumo

O dashboard atual (e o plano anterior) confundia **operação** com **produto**. "OS concluídas no prazo" ou "Conformidade ASO" são KPIs de negócio dos clientes — se caem, provavelmente é o técnico ou o processo do cliente, não o Arrow. Um PM Dashboard deve responder: **o Arrow está sendo adotado, é confiável, e está resolvendo as dores certas?**

## Novo foco: 4 dimensões de saúde do produto

### 1. Adoção & engajamento (o produto está sendo usado?)
- **WAU / MAU** — usuários ativos únicos (`auth.users` last_sign_in, ou eventos).
- **Stickiness** — WAU/MAU.
- **Adoção por módulo** — % de empresas/usuários que usaram cada módulo (OS, SGQ, RH, CRM, Financeiro, Marina) nos últimos 30d.
- **Feature adoption** — quantos usuários usaram funcionalidades-chave lançadas recentemente (ex.: compartilhamento de docs, chat Marina, upload de anexos).

### 2. Confiabilidade & qualidade (o produto funciona?)
- **Volume de tickets de bug** vs **melhoria** vs **dúvida** (`support_tickets.category`).
- **Tickets abertos / resolvidos** por semana; backlog de bugs.
- **Tempo médio de resolução de tickets**.
- **Bugs por módulo** (`impacted_module`) — mostra onde o produto está frágil.
- **Reincidência** — tickets reabertos via `triage-ticket-reply`.

### 3. Descoberta & voz do usuário (o que os usuários pedem?)
- **Top dores** — clusters de `support_tickets` por módulo × categoria × role.
- **Feedback da Marina** — `ai_feedback` positivos/negativos.
- **NPS interno leve** (se surgir) — opcional futuro.
- **Ideias/sugestões** — tickets categoria "sugestão/melhoria" agrupados.

### 4. Entrega & impacto (estamos entregando o que importa?)
- **Velocidade** — releases no changelog / mês, tickets fechados / semana.
- **Cobertura RICE** — % de tickets pontuados; distribuição do backlog por RICE.
- **Cycle time** — tempo de criação → resolução de tickets.
- **Impacto pós-release** — variação nas métricas das 3 dimensões acima após entradas no changelog (antes/depois).

## North Star candidatas (a decidir com você)
Métricas de **produto**, não de operação:
- **% de empresas ativas semanalmente** (empresa com ≥1 usuário ativo em ≥2 módulos/semana).
- **Módulos usados por empresa (média)** — indicador de amplitude de adoção.
- **Tickets de bug por 100 sessões** — inverso da confiabilidade.
- **Taxa de resolução de tickets em 7d**.

Você escolhe uma; as outras viram *supporting metrics*.

## Como a Marina alimenta isso

### Fontes de dados que já existem no Arrow
- `auth.users` (last_sign_in), `profiles` — adoção/atividade.
- `support_tickets` — bugs, dores, categorias, RICE, módulo.
- `ai_messages`, `ai_feedback`, `ai_conversations` — engajamento Marina.
- `notifications`, `corp_feed_posts`, `crm_opportunities`, `service_orders`, etc. — sinais de uso por módulo (contagem de criações/updates por semana, **não** de resultado operacional).
- `pm_changelog` — releases para antes/depois.

### Edge Functions novas
1. **`pm-product-metrics-refresh`** — roda queries de adoção, confiabilidade, velocidade; grava em `pm_metric_snapshots`. Agendada diária via `pg_cron`.
2. **`pm-insights-suggest`** — Marina lê tickets recentes + snapshots e sugere:
   - clusters de dor ("15 tickets sobre upload de arquivos no SGQ este mês");
   - Outcomes/Opportunities para o OST;
   - hipóteses de causa (bug vs. UX vs. treinamento).
   Grava sugestões que o PM aceita → `pm_ost_nodes` + `pm_ticket_ost_links`.
3. **`pm-rice-score`** (já existe) — mantém, agora com botão "pontuar em lote".

### Ferramentas da Marina no chat (`ai_assistant_actions`)
- `pm_refresh_product_metrics`
- `pm_cluster_tickets` — devolve top clusters de dor.
- `pm_suggest_ost` — propostas de OST vinculadas a métrica-alvo.
- `pm_score_tickets_bulk`
- `pm_add_changelog` — pré-preenche antes/depois pegando snapshots.

## Mudanças de UI no `PMDashboard.tsx`
- **Aba 1 "Saúde do produto"** (nova): cards de WAU/MAU, adoção por módulo, tickets/bugs por semana, top dores.
- **Aba 2 "OST & North Star"**: catálogo de métricas de produto (não operacionais), botão "Sugerir com Marina".
- **Aba 3 "Backlog & RICE"**: fila de tickets com RICE, filtros por módulo/categoria, "pontuar pendentes".
- **Aba 4 "Releases & Impacto"**: changelog com delta de métricas antes/depois.
- Remover placeholders operacionais ("OS no prazo", "Conformidade ASO", "Fechamento de OS") — substituir por exemplos de produto ("WAU", "Adoção do módulo SGQ", "Bugs/100 sessões").

## Fora de escopo
- Nada de KPIs operacionais dos clientes. Esses continuam vivendo nos dashboards de cada módulo.
- Sem mudança nas tabelas PM já criadas — só uso.

## Perguntas antes de eu executar
1. **Quer uma única North Star agora** (minha sugestão: *% de empresas ativas semanalmente em ≥2 módulos*) ou prefere deixar em branco e cadastrar você mesmo?
2. **"Ativo" = login nos últimos 7d** ou **executou ≥1 ação de escrita em 7d** (mais rigoroso, mais fiel)?
3. Quer que eu execute tudo (métricas + insights Marina + UI) numa leva só, ou prefere fatiar em: (a) métricas + refresh + cron, (b) clusters/OST da Marina, (c) UI reformada?
