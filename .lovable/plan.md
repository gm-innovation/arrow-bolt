# Plano de Testes — Módulo Coordenadores & Gerentes

Objetivo: validar de ponta a ponta as rotas `/admin/*` (Coordenador) e `/manager/*` (Diretor/Gerente), identificar bugs, RLS quebrada, dados ausentes, crashes e inconsistências de UI/data.

## Metodologia

1. **Automação via Playwright** com sessão Supabase injetada (login já disponível).
2. **Duas personas**: coordenador e diretor. Se não houver conta diretor disponível, testo apenas coordenador e uso `supabase--read_query` para validar visibilidade que exigiria a role diretor.
3. **Screenshots** de cada tela crítica em `/tmp/browser/coord-manager/` para inspeção visual.
4. **Console + Network** monitorados durante cada fluxo (erros 4xx/5xx, RLS, timeouts).
5. **SQL** para conferir integridade após ações de escrita (OS criada, transferência, medição).

## Escopo — Coordenador (`/admin/*`)

| Área | Verificações |
|---|---|
| Dashboard | KPIs carregam, gráficos renderizam, sem crashes |
| Ordens de Serviço | Listagem, filtros, criar OS, editar, docking mode, PC/PO/RFQ |
| Calendário de Serviços | Render, filtros por técnico, drag/drop se aplicável |
| Histórico de Serviços | Filtros por embarcação/cliente |
| Transferências | Criar transferência batch de técnicos |
| Reservas de Técnicos | Bloqueio sem OS, conflitos |
| Localizações de Técnicos | Mapa/lista |
| Oportunidades (CRM serviço) | Kanban, leads segmentados, conversão |
| Medições | Iniciar sob demanda, sub-tabelas (mão de obra, materiais, viagens, despesas, serviços), ISS por dentro, exportação |
| Checklists | Templates + respostas |
| Task Types / Measurement Settings | CRUD de configurações |
| Usuários | Listagem por company_id |
| Audit Logs | Render + filtros |
| AI Analytics | Painel funcional |
| Perfil / Configurações | Auto-serviço |

## Escopo — Diretor/Gerente (`/manager/*`)

| Área | Verificações |
|---|---|
| Dashboard | Filtro por coordenador, KPIs consolidados, tendências |
| Coordenadores | Lista, produtividade, drill-down |
| Relatórios | `useManagerReports` com filtros de data + coordenador |
| Ordens de Serviço | Visibilidade total da empresa, edição gated por ownership |
| Configurações | Acessos administrativos |
| Aprovações Corporativas | Fluxo direto de aprovação (bypass gerentes) |

## Checks Cruzados

- **RLS**: coordenador só vê OSs da própria empresa; diretor vê tudo da empresa.
- **Timezone**: datas exibidas com `formatLocalDate` (sem shift -1).
- **Roles**: `coordinator` e `director` corretamente resolvidos em `roleRedirects` e sidebars.
- **Race conditions**: criação de OS + trigger de medição (usar `.maybeSingle()`).
- **Contagem de coordenadores** em `useManagerReports` bate com `user_roles`.

## Entregáveis

1. Relatório por área: ✅ OK / ⚠️ warning / ❌ bug, com screenshot e log.
2. Lista priorizada de correções (P0 crash, P1 funcional, P2 UX).
3. Recomendação sobre quais itens corrigir imediatamente vs enfileirar.

## Detalhes Técnicos

- Scripts em `/tmp/browser/coord-manager/{admin,manager}/*.py`, headless Chromium, viewport 1280x1800.
- Restaurar sessão via `LOVABLE_BROWSER_SUPABASE_*` antes de navegar.
- Consultas de verificação via `supabase--read_query` (ex: `service_orders`, `user_roles`, `measurements`).
- Logs de edge functions relevantes (`check-critical-orders`, `commercial-ai-insights` se cruzar) via `supabase--edge_function_logs`.
- Sem alterações de código nesta fase — apenas diagnóstico. Correções entram em plano separado após relatório.
