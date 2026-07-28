# Walkthrough Guiado pela Marina — cobertura completa

Tour interativo overlay sobre a UI real, com passos por papel, checkpoints persistidos, editor no Super Admin e **conteúdo completo pré-populado para todos os 8 papéis operacionais + super_admin**.

## Arquitetura

```text
┌─ Super Admin ────────────┐        ┌─ Runtime (todos os papéis) ─┐
│ Editor de Roteiros       │        │ WalkthroughProvider (global)│
│ /super-admin/walkthroughs│        │  ├─ carrega roteiro do papel│
└──────────┬───────────────┘        │  ├─ overlay + spotlight     │
           │ CRUD                   │  ├─ navega entre rotas       │
           ▼                        │  └─ salva progresso          │
   walkthrough_scripts              │ MarinaBubble (fala + ações) │
   walkthrough_steps                └────────┬────────────────────┘
   walkthrough_progress                      │
           ▲                                 │
           └── RLS por role/user ────────────┘
```

## Modelo de dados

- `walkthrough_scripts`: `slug`, `title`, `description`, `target_role` (app_role, null = todos), `module`, `version` (int), `is_active`, `trigger` (`first_login` | `on_version` | `manual`), `min_app_version`.
- `walkthrough_steps`: `script_id`, `order_index`, `route`, `selector`, `title`, `body` (markdown), `action` (`none` | `click` | `navigate` | `wait`), `checkpoint` (bool), `optional` (bool).
- `walkthrough_progress`: `user_id`, `script_id`, `last_step_index`, `status` (`in_progress`/`completed`/`skipped`), `completed_at`, `app_version_seen`. Unique `(user_id, script_id)`.

RLS: leitura autenticada para scripts/steps ativos; escrita apenas `super_admin`. Progress: dono lê/edita, super_admin lê tudo. GRANTs para `authenticated` e `service_role`.

## Runtime

Novos arquivos:
- `src/contexts/WalkthroughContext.tsx` — provider global montado no `App.tsx` dentro do `AuthProvider`. Expõe `startWalkthrough(slug?)`, `next`, `prev`, `skip`, `pause`, `complete`.
- `src/components/walkthrough/WalkthroughOverlay.tsx` — portal com máscara escurecida e spotlight (recorte via `getBoundingClientRect`, atualiza em `scroll`/`resize`).
- `src/components/walkthrough/MarinaTourBubble.tsx` — balão ancorado ao elemento, com avatar da Marina (mesma fonte do `AIAssistant`), título, corpo (markdown), botões Voltar/Pular/Pausar/Próximo/Concluir, badge “passo X de N”.
- `src/hooks/useWalkthrough.ts` — consumidor.
- `src/hooks/useWalkthroughAutoStart.ts` — auto-dispara no primeiro login e quando `min_app_version` > `app_version_seen`.

Comportamento:
- Ao trocar `route`, o provider `navigate(route)` e espera o `selector` aparecer (`MutationObserver`, timeout 3s; se falhar, pula passo silenciosamente e loga).
- `action: "click"` deixa o clique real passar no elemento destacado; resto bloqueado.
- Checkpoints gravam `last_step_index` no banco.
- Pausar fecha overlay mantendo progresso.
- Ignora rotas públicas (`/login`, `/signup`, `/onboarding/*`, `/public/*`).

## Gatilhos

1. **First login**: `useWalkthroughAutoStart` no `DashboardLayout`.
2. **Após update**: `min_app_version` do script > `app_version_seen`.
3. **Manual**: item “Tour guiado da Marina” no `UserMenu` e botão “Fazer o tour deste módulo” no `AIAssistant`.

## Editor no Super Admin

- Rota `/super-admin/walkthroughs` + entrada no sidebar do super_admin em `DashboardLayout.tsx`.
- Página `src/pages/super-admin/Walkthroughs.tsx`: lista com filtros (papel/módulo/status), dialog de metadados, lista de passos reordenável (drag), campos rota/seletor/título/corpo/ação/checkpoint/opcional.
- Botão “Capturar seletor” — abre rota alvo com `?wt-capture=1`; helper `src/lib/walkthroughCapture.ts` injeta picker que devolve seletor estável (`[data-tour]` > `id` > path curto) via `postMessage`.
- “Executar como <papel>” — preview no super_admin sem gravar progresso.
- Componentes-alvo passam a expor `data-tour="..."` para seletores estáveis (adicionados nos alvos dos roteiros abaixo).

## Conteúdo completo — roteiros pré-populados

Inseridos via `supabase--insert` após a migration. Todos em pt-BR, `version = 1`, `trigger = first_login`, `is_active = true`. Cada roteiro tem título de boas-vindas, passos numerados e ≥3 checkpoints.

### 1. `director-welcome` — Diretor (12 passos)
Rotas: `/manager/dashboard`, `/manager/service-orders`, `/manager/reports`, `/manager/coordinators`, `/super-admin/pm-dashboard` (se acumular), `/account/settings`.
Passos: apresentação da Marina → visão executiva → KPIs → aprovações pendentes → OS em andamento → transferências → indicadores por coordenador → relatórios estratégicos → CRM pipeline (leitura) → Corp feed / solicitações diretas → central de aprovações Qualidade → conclusão + como reabrir tour.

### 2. `coordinator-welcome` — Coordenador/Gerente/Admin (14 passos)
Rotas: `/admin/dashboard`, `/admin/service-orders`, `/admin/service-calendar`, `/admin/service-transfers`, `/admin/technician-reservations`, `/admin/opportunities`, `/admin/users`, `/admin/checklists`, `/admin/settings`.
Passos: boas-vindas → dashboard operacional → criar OS → agenda de técnicos → conflitos e reservas → transferências em lote → medições e checklists → oportunidades comerciais (visão) → gestão de usuários da equipe → configurações da empresa → integrações Omie/Eva → notificações → Marina como copiloto → conclusão.

### 3. `technician-welcome` — Técnico (10 passos)
Rotas: `/tech/dashboard`, `/tech/tasks`, `/tech/service-orders`, `/tech/notifications`, `/tech/profile`, `/tech/install-app`.
Passos: boas-vindas → minhas OS de hoje → checkin/checkout com geolocalização → tarefas e evidências fotográficas → relatório assinado → medições em campo → notificações → perfil e documentos pessoais → instalar como PWA → conclusão.

### 4. `hr-welcome` — RH (16 passos)
Rotas: `/hr/dashboard`, `/hr/document-compliance`, `/hr/document-reviews`, `/hr/documents`, `/hr/document-sharing`, `/hr/onboarding`, `/hr/onboarding-settings`, `/hr/health-exams`, `/hr/vacations`, `/hr/time-control`, `/hr/on-call`, `/hr/epi`, `/hr/partnerships`, `/hr/payroll-export`, `/hr/reports`, `/hr/settings`.
Passos: boas-vindas → dashboard de conformidade → catálogo de documentos por cargo → fila de revisão de documentos enviados → gestão documental por colaborador → compartilhamento com coordenadores → onboarding público → configurações do onboarding → ASO / exames periódicos → períodos e solicitações de férias → controle de ponto e ajustes → escalas e sobreaviso → EPIs e entregas → parcerias e benefícios → exportação de folha → relatórios → conclusão.

### 5. `commercial-welcome` — Comercial (12 passos)
Rotas: `/commercial/dashboard`, `/commercial/leads`, `/commercial/opportunities`, `/commercial/clients`, `/commercial/sales`, `/commercial/tasks`, `/commercial/products`, `/commercial/knowledge`, `/commercial/reports`, `/commercial/settings`.
Passos: boas-vindas → dashboard e KPIs → captação de leads / kanban → oportunidades e RICE → dossiê do cliente (5 abas) → busca por CNPJ → vendas e estoque → tarefas comerciais → produtos e recorrências → base de conhecimento segmentada → relatórios → Marina como assistente comercial → conclusão.

### 6. `financeiro-welcome` — Financeiro (9 passos)
Rotas: `/finance/dashboard`, `/finance/receivables`, `/finance/payables`, `/finance/reimbursements`, `/finance/reports`, `/finance/settings`.
Passos: boas-vindas → dashboard financeiro → contas a receber → contas a pagar → reembolsos com anexos → categorias e centros → relatórios e exportações → integrações → conclusão.

### 7. `qualidade-welcome` — Qualidade (18 passos)
Rotas: `/quality/dashboard`, `/quality/documents`, `/quality/document-types`, `/quality/planning`, `/quality/org-context`, `/quality/interested-parties`, `/quality/processes`, `/quality/risks`, `/quality/objectives`, `/quality/indicators`, `/quality/audits`, `/quality/ncrs`, `/quality/deviations`, `/quality/complaints`, `/quality/action-plans`, `/quality/management-reviews`, `/quality/competencies`, `/quality/awareness`, `/quality/communication`, `/quality/controlled-copies`, `/quality/devices`, `/quality/knowledge`, `/quality/settings`.
Passos: boas-vindas → hub de contexto (SWOT/Missão/Visão) → partes interessadas → mapa de processos → riscos e oportunidades → objetivos e metas → indicadores e medições → documentos controlados (com marcas d'água) → tipos e normas → planejamento anual → auditorias internas → NCRs e desvios → reclamações e satisfação → planos de ação → análise crítica pela direção → competências e conscientizações → cópias controladas → dispositivos de medição e calibração → conscientização e comunicação → base de conhecimento → homologação (agora em Suprimentos) → configurações → conclusão. (Passos serão consolidados em 18 marcando cada grupo com checkpoint.)

### 8. `compras-welcome` — Compras/Suprimentos (8 passos)
Rotas: `/supplies/dashboard`, `/supplies/requests`, `/supplies/suppliers`, `/supplies/homologations`, `/supplies/settings`.
Passos: boas-vindas → dashboard de suprimentos → fila de solicitações e aprovações → itens e totais automáticos → provedores externos → homologações e requalificações → configurações → conclusão.

### 9. `super-admin-welcome` — Super Admin (12 passos)
Rotas: `/super-admin/dashboard`, `/super-admin/pm-dashboard`, `/super-admin/companies`, `/super-admin/users`, `/super-admin/subscriptions`, `/super-admin/roadmap-board`, `/super-admin/ai-management`, `/super-admin/walkthroughs`, `/super-admin/api-docs`, `/super-admin/settings`.
Passos: boas-vindas → dashboard global → PM Dashboard (métricas, OST, IA & Impacto, histórico) → empresas e planos → usuários globais → assinaturas → Roadmap + drag&drop → gestão da Marina (comportamento, treinamento por escopo, ações) → editor de walkthroughs (esta tela) → API & Integrações → configurações globais → conclusão.

### 10. `marketing-welcome` — Marketing (6 passos)
Reaproveita rotas comerciais + landing/leads públicos. Passos: boas-vindas → leads do site → campanhas de satisfação → base de conhecimento → integração com Comercial → conclusão.

Total: ~117 passos pré-cadastrados cobrindo todos os papéis do enum `app_role`.

## Marcação `data-tour` a adicionar

Para cada roteiro, os componentes principais das rotas alvo recebem atributos estáveis, ex.:
- `data-tour="sidebar.menu.<slug>"` nos itens do `DashboardLayout`.
- `data-tour="<module>.dashboard.<card>"` nos cards principais de cada dashboard.
- `data-tour="<module>.table.newButton"` nos botões “Novo …”.
- `data-tour="userMenu.tour"` no item de menu que reabre o tour.

Lista fechada por roteiro será entregue junto do seed para que os seletores existam no primeiro deploy — nenhum passo cai no fallback silencioso.

## i18n

- Chaves `walkthrough.*` em pt-BR para UI (botões, badges, mensagens do editor, tooltips).
- Conteúdo (`title`/`body`) dos passos é editável no banco em pt-BR — fora do bundle de i18n.

## Integração com Marina existente

- Bubble reusa avatar/nome do `ai_agents.is_default` (mesmo padrão do `AIAssistant`).
- Conclusão/pausa/skip gravam em `pm_activity_log` (`action_type = "walkthrough_completed" | "walkthrough_skipped"`) — alimenta o histórico do PM Dashboard.
- Sem chamada a modelo neste corte; fase 2 pode gerar sugestões de passos via `ai-assistant`.

## Passos de entrega

1. Migration: `walkthrough_scripts`, `walkthrough_steps`, `walkthrough_progress` (+ índices, GRANTs, RLS, trigger updated_at).
2. Provider + overlay + bubble + hooks; wiring em `App.tsx` e `DashboardLayout.tsx`.
3. `UserMenu` ganha “Tour guiado”; `AIAssistant` ganha “Fazer o tour deste módulo”.
4. Página `/super-admin/walkthroughs` + rota + item no sidebar do super_admin.
5. Helper de captura de seletor + modo preview “Executar como <papel>”.
6. Adição dos atributos `data-tour="..."` nos componentes alvo dos 10 roteiros.
7. Seed completo dos 10 roteiros com todos os passos via `supabase--insert`.
8. Log em `pm_activity_log` na conclusão/pular.

## Fora deste escopo

- Geração automática de roteiros pela Marina (fase 2).
- Tours ramificados / condicionais (fase 2).
- Analytics por passo (hoje só status agregado + log de conclusão).
