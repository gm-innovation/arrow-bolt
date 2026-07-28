## Contexto

O card **Roadmap — Now / Next / Later** do PM Dashboard lê de `support_tickets` filtrando por `roadmap_horizon` (`now` | `next` | `later` | `icebox`). Hoje só existem 2 tickets no banco e nenhum tem horizonte definido — por isso os 4 quadrantes aparecem "Vazio".

Para alimentar o roadmap sem mudar a UI, vou inserir **tickets estratégicos** (um por iniciativa) já classificados por horizonte, marcados com uma categoria dedicada (`roadmap_initiative`) para não se misturarem ao backlog de bugs/pedidos de usuário.

## Distribuição proposta

### Agora (em execução no momento)
1. **PM Dashboard — Saúde do Produto (fase 1)** — refresh manual das 13 métricas via Marina; falta cron diário + gráficos de tendência. *Módulo: PM.*
2. **Marina Copiloto — escrita auditada + suporte** — triagem bidirecional de tickets, contexto técnico, sugestões contextuais. *Módulo: IA.*
3. **RH Onda 2 — Revisão documental & compliance** — página `/hr/document-reviews`, obsolescência, uploads Office. *Módulo: RH.*
4. **SGQ V3 — Marcas d'água, Conscientizações, SWOT** — em finalização. *Módulo: SGQ.*

### Próximo (fila imediata, semanas)
5. **Walkthrough guiado pela Marina** — tour interativo por papel (Diretor, Coordenador, Técnico, RH, Comercial, Financeiro, Qualidade, Compras) para onboarding e reintrodução após updates. Marina apresenta cada módulo em contexto, com passos clicáveis e checkpoints ("Já conheço", "Me mostra"). *Módulo: IA + Plataforma.*
6. **Central de novidades in-app ("O que há de novo")** — toda entrada de `pm_changelog` com impacto em uso/UX/produtividade vira um card visível no app: modal na primeira visita pós-release, badge no menu do usuário, e post automático no Feed Corporativo. Marcação de "lido" por usuário. *Módulo: Plataforma + Feed.*
7. **Notificações mais efetivas (multi-superfície)** — além do sino: (a) toast persistente para notificações críticas, (b) drawer lateral com fila agrupada por tipo, (c) badge no ícone do módulo afetado na sidebar, (d) push web (já temos infra) ativado por padrão para eventos críticos, (e) resumo diário no topo do dashboard. Preferências por usuário. *Módulo: Notificações.*
8. **`pm-insights-suggest`** — Marina propõe nós de OST a partir de clusters de tickets.
9. **Cron diário `pm-product-metrics-refresh`** + série histórica em `pm_metric_snapshots` para tendências.
10. **Ferramentas de chat Marina para PM** — perguntas em linguagem natural sobre saúde do produto.
11. **RH Onda 3 — Dashboard RH & Self-service** — indicadores de conformidade, portal consolidado.

### Depois (próximos ciclos)
12. **RH Onda 4 — E-mail transacional** (ASO, férias, docs vencendo).
13. **RH Onda 5 — WhatsApp** — canal de notificação e coleta de docs.
14. **CRM — Recorrências e renovações automáticas** com Marina.
15. **Universidade Corporativa — trilhas obrigatórias por cargo** integradas ao SGQ.
16. **PM Dashboard fase 2 — OST-suggest automático + changelog auto-preenchido a partir de releases.**
17. **Walkthrough Marina fase 2** — modo "coach" contínuo: Marina detecta uso subótimo (ex.: coordenador nunca abriu o Kanban de leads) e oferece um mini-tour direcionado.

### Gelo (ideias válidas, sem prioridade)
18. **App mobile nativo (técnicos).**
19. **Marketplace de integrações** (Zapier/Make público).
20. **Módulo Financeiro avançado** — DRE gerencial, fluxo de caixa projetado.
21. **BI embarcado / dashboards customizáveis pelo cliente.**
22. **Multi-idioma (EN/ES).**

## Execução técnica

Migração única que insere 22 linhas em `support_tickets`:

```sql
insert into support_tickets
  (title, description, category, priority, status, user_role,
   impacted_module, roadmap_horizon)
values
  ('PM Dashboard — Saúde do Produto (fase 1)', '...', 'roadmap_initiative', 'high', 'in_progress', 'super_admin', 'PM', 'now'),
  ...
  ('Walkthrough guiado pela Marina', '...', 'roadmap_initiative', 'high', 'open', 'super_admin', 'IA', 'next'),
  ('Central de novidades in-app', '...', 'roadmap_initiative', 'high', 'open', 'super_admin', 'Plataforma', 'next'),
  ('Notificações mais efetivas (multi-superfície)', '...', 'roadmap_initiative', 'high', 'open', 'super_admin', 'Notificações', 'next'),
  ...
  ('Multi-idioma (EN/ES)', '...', 'roadmap_initiative', 'low', 'open', 'super_admin', 'Plataforma', 'icebox');
```

- `category = 'roadmap_initiative'` isola essas linhas do backlog de bugs/pedidos.
- Nenhum RICE é calculado — iniciativas estratégicas não passam pelo scoring.
- UI não muda: os quadrantes já lêem `roadmap_horizon` e populam automaticamente.

## Fora do escopo desta fatia

- Implementar de fato o Walkthrough, a Central de Novidades e a nova estrutura de notificações — cada um é uma fatia própria depois que o roadmap for aprovado.
- Reformar o Roadmap para ler de `pm_ost_nodes`.
- Cron, `pm-insights-suggest`, gráficos de tendência.

Se aprovar, executo a migração e valido no dashboard.