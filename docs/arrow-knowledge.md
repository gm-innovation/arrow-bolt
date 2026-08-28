# Arrow — Knowledge Base para Agentes de IA

Documento de contexto em nível de **visão geral por módulo**. Destinado a agentes de IA externos (ChatGPT via MCP, Cursor, Claude, Codex) e a novos desenvolvedores. Não contém segredos, IDs de projeto nem URLs de backend.

---

## 1. Identidade

O **Arrow** é uma plataforma de gestão operacional (ERP + SGQ + RH + CRM) construída para a **Lecsor Technology**, atuante em serviços técnicos navais e industriais (calibração, inspeção, medição, docagem de embarcações).

Características centrais:

- **Multiempresa**: quase todos os dados são segmentados por `company_id`.
- **Multipapel**: cada área funcional tem sua própria rota base, sidebar e permissões.
- **Multi-plataforma**: aplicação web, PWA instalável e app Android nativo (Capacitor), com atualizações OTA do bundle web.
- **Idioma**: interface e dados em português do Brasil.

---

## 2. Stack e arquitetura

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui |
| Dados/estado | TanStack Query (hooks `use*` por domínio), React Context para auth e walkthrough |
| Backend | Lovable Cloud (Postgres + Auth + Storage + Edge Functions em Deno) |
| Segurança de dados | Row Level Security (RLS) em todas as tabelas públicas, papéis em tabela separada |
| Nativo | Capacitor (câmera, GPS, push, biometria, scanner) |
| OTA | Bundle web publicado via GitHub Releases e servido por Edge Function com URL assinada |
| IA | Lovable AI Gateway (chat, voz, embeddings/RAG) |
| Integração externa | Servidor MCP exposto como Edge Function (`supabase/functions/mcp`) |

Padrão de organização:

```text
src/pages/<área>/         telas por área funcional
src/components/<área>/    componentes e diálogos daquela área
src/hooks/use<Domínio>.ts acesso a dados + mutations (TanStack Query)
src/lib/                  utilitários, offline storage, plataforma, MCP tools
supabase/functions/<nome>/ Edge Functions (lógica privilegiada e integrações)
```

---

## 3. Papéis e áreas

| Papel | Rota base | Escopo |
| --- | --- | --- |
| `super_admin` | `/super-admin/*` | Produto e plataforma: PM Dashboard, gestão de IA, walkthroughs, empresas, assinaturas, inbox de suporte, API docs |
| `director` | `/manager/*` | Visão estratégica, aprovações, coordenadores, relatórios executivos |
| `coordinator` (gestão operacional) | `/admin/*` | Ordens de serviço, agenda, clientes, embarcações, medições, transferências |
| `technician` | `/tech/*` | Tarefas de campo, relatórios técnicos, notificações, pesquisas |
| `hr` | `/hr/*` | RH e Departamento Pessoal |
| `commercial` / `marketing` | `/commercial/*` | CRM, oportunidades, vendas, leads, base de conhecimento comercial |
| `quality` | `/quality/*` | SGQ ISO 9001 |
| `finance` | `/finance/*` | Contas a pagar/receber, reembolsos |
| Suprimentos | `/supplies/*` | Requisições de compra, provedores externos, homologação |
| Todos os colaboradores | `/corp/*` e `/account/*` | Feed, solicitações, documentos pessoais, universidade, perfil, tickets |

Notas importantes de nomenclatura:

- `director` **não** é sinônimo de coordenador: é papel estratégico com poder de aprovação. `coordinator` é o administrador operacional (substitui a antiga ideia de "manager/admin").
- Papéis vivem em tabela dedicada de papéis, nunca em `profiles`. Verificação sempre por função `SECURITY DEFINER`.

Rotas públicas (sem login): `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/install`, `/onboarding/:token`, `/carreiras/:slug`, `/q/:token`, `/satisfaction/r/:token`.

---

## 4. Mapa de módulos

### 4.1 Operação / Ordens de Serviço (`/admin/*`, `/manager/*`)

Núcleo do negócio. Telas: `orders`, `calendar`, `history`, `transfers`, `reservations`, `clients`, `vessels`, `task-types`, `checklists`, `technician-locations`, `audit-logs`.

Conceitos: OS vinculada a cliente + embarcação; referência do cliente (PC/PO/RFQ); atribuição de um ou mais técnicos; modo **docagem** (OS-mãe com grupos de atividades filhos); reservas de técnico sem OS completa; transferência em lote de técnicos; serviços de preço fechado podem existir sem técnico.

### 4.2 Técnicos (`/tech/*`)

Área de campo. Telas: `tasks`, detalhe de tarefa, `reports` (novo/editar), `notifications`, `survey/:taskId`, `install`.

Conceitos: execução de tarefa com evidências (foto, GPS, assinatura); relatório técnico assinado; recursos nativos degradam para web quando não há app instalado.

### 4.3 Medições e faturamento (`/admin/measurement-settings`, `/commercial/measurements`)

Agrega mão de obra, materiais, serviços, viagens e despesas de uma OS para gerar a medição final. Categorias tributárias de ISS calculadas "por dentro". Coordenadores podem inicializar medições sob demanda.

### 4.4 RH e Departamento Pessoal (`/hr/*`)

Telas: `dashboard`, `employees`, `technicians`, `documents`, `document-compliance`, `document-reviews`, `document-sharing`, `health-exams`, `epi`, `vacations`, `absences`, `on-call`, `holidays`, `time-control`, `payroll-export`, `recruitment`, `onboarding` (+ `settings`), `partnerships`, `university`, `reports`.

Conceitos: cadastro unificado de colaboradores; hierarquia via gestor direto; documentos obrigatórios por cargo com dashboard de conformidade e fluxo de revisão pelo RH; SST (ASO, EPI); onboarding público por token para candidatos externos; dossiê do colaborador com notas administrativas.

### 4.5 Corporativo (`/corp/*`)

Camada social e de serviços internos para todos os colaboradores. Telas: `feed` (+ discussões), `groups`, `requests`, `documents`, `my-documents`, `dashboard`, `reports`, `profile`, administração (`departments`, `request-types`, `audit-log`).

Conceitos: solicitações bidirecionais (enviadas e recebidas) com aprovação direta pelo diretor; encaminhamento de documentos por departamento; gamificação com XP e badges; grupos manuais e automáticos.

### 4.6 Universidade Corporativa (`/corp/university/*`)

Catálogo de cursos, trilhas de aprendizagem, minha aprendizagem e certificados em PDF (A4 paisagem). Conclusões geram post automático no feed e recompensas de XP configuráveis.

### 4.7 Qualidade — SGQ ISO 9001 (`/quality/*`)

Módulo mais extenso. Grupos de telas:

- **Documentos**: `documents`, `master-list`, `company`, `norms`, `copies`, `controlled-copies`, `terms`, links públicos.
- **Melhoria**: `ncrs`, `deviations`, `improvements`, `action-plans`, `complaints`.
- **Avaliação**: `audits`, `management-review`, `reports`, `satisfaction`, `voice-of-customer`.
- **Contexto e planejamento**: `iso-structure`, `interested-parties`, `planning` (objetivos, indicadores, mudanças), `risks` e `risks-hub`.
- **Pessoas**: `competencies` (matriz, programa, conscientização), `my-competencies`, `my-acknowledgements`, `signature`.
- **Infra**: `calibration`, `devices`, `safety`, `communication`, `knowledge`.

Conceitos: documentos controlados com versão, revisão periódica e cópias controladas com marca d'água; conscientizações registradas por colaborador; auditorias com anexos de evidência.

### 4.8 Comercial / CRM (`/commercial/*`)

Telas: `dashboard`, `clients`, `buyers`, `opportunities`, `sales`, `products`, `site-leads`, `tasks`, `recurrences`, `knowledge-base`, `ai-insights`, `reports`, `measurements`, administração (`services`, `schedules`, `users`, `import`, `integration-logs`).

Conceitos: dossiê do cliente em abas; grupos de clientes por cliente-pai; contato principal criado junto do cliente; lead time de produto para alertas de renovação; venda confirmada baixa estoque; busca automática por CNPJ.

### 4.9 Suprimentos (`/supplies/*`)

Requisições de compra com fluxo `draft → pending_director → pending_department`, totais sincronizados por trigger, além de provedores externos e homologação de fornecedores.

### 4.10 Financeiro (`/finance/*`)

Contas a pagar, contas a receber, reembolsos, relatórios e configurações.

### 4.11 IA — Marina (`/*/chat`, `/super-admin/ai-management`)

Marina é o copiloto operacional e de PM. Capacidades: chat com contexto do usuário autenticado, RAG sobre base de conhecimento indexada, voz (STT/TTS), escrita auditada de ações, abertura e triagem de tickets, manipulação do roadmap e registro de mudanças. Treinamento configurável por escopo: global, por papel e por módulo.

### 4.12 Super Admin / PM (`/super-admin/*`)

`pm-dashboard` (métricas North Star, OST, changelog, roadmap com scoring RICE e drag & drop), `walkthroughs` (editor de tours guiados pela Marina), `ai-management`, `companies`, `subscriptions`, `users`, `support-inbox`, `api-docs`.

---

## 5. Fluxos transversais

1. **Ciclo da OS**: criação (manual ou importada do ERP) → agendamento e atribuição de técnicos → execução em campo com evidências → relatório assinado → medição final → faturamento.
2. **Medição → faturamento**: itens de mão de obra, material, serviço, viagem e despesa são somados, recebem tratamento tributário por categoria e viram base do faturamento.
3. **Solicitação corporativa**: colaborador abre solicitação → diretor aprova diretamente → departamento responsável executa.
4. **Revisão documental de RH**: colaborador envia documento obrigatório → RH revisa e aprova/rejeita → conformidade por cargo é recalculada → próxima revisão agendada (ajustável manualmente).
5. **Documento do SGQ**: elaboração → aprovação → publicação com versão → conscientização dos envolvidos → revisão periódica ou obsolescência com justificativa.
6. **Ticket de suporte**: usuário relata pela Marina → triagem por IA → bug vira correção; não-bug entra no roadmap na coluna "Gelo".

---

## 6. Convenções que um agente deve respeitar

- **Datas**: usar `new Date(y, m-1, d)` ou `parseISO()`. Nunca `new Date('YYYY-MM-DD')` (desloca o fuso).
- **RLS**: toda tabela nova em `public` precisa de `GRANT` explícito + RLS habilitado + políticas. Sem política, a tabela fica inacessível.
- **Papéis**: sempre em tabela dedicada, verificados por função `SECURITY DEFINER`. Jamais em `profiles` e jamais a partir de `localStorage`.
- **Edge Functions**: registrar em `supabase/config.toml` com `verify_jwt = true`.
- **Nativo**: qualquer recurso de dispositivo deve degradar para web via `isNativeApp()`.
- **Arquivos auto-gerados (não editar)**: cliente e tipos gerados do backend, `.env`, `supabase/config.toml` em nível de projeto, e o handler MCP gerado.
- **Uploads**: sanitizar nome de arquivo (remover acentos e espaços); input nativo sobreposto com `opacity-0 absolute inset-0`.
- **Formulários**: preferir Combobox/Select a listas de cards; exibir erros de validação via toast no `onError`.
- **Dados após trigger**: usar `.maybeSingle()` ao buscar registros criados por trigger, evitando condição de corrida.

---

## 7. Integrações

| Integração | Função |
| --- | --- |
| Omie ERP | Sincronização de clientes, OS e materiais via Edge Function proxy centralizada |
| WhatsApp | Notificações operacionais e webhook de entrada |
| Lovable AI Gateway | Chat, voz (STT/TTS), embeddings e insights comerciais |
| Push | Notificações web e nativas |
| GitHub Actions | Build de APK Android e publicação do bundle OTA |
| MCP | Exposição de ferramentas do Arrow a assistentes externos, autenticadas por OAuth com RLS do usuário |
| APIs públicas | Captação de leads do site, vagas e candidaturas, documentos públicos do SGQ, pesquisas de satisfação |

---

## 8. Onde olhar no código

- Rotas e layouts por área: `src/App.tsx`.
- Telas: `src/pages/<área>/`.
- Regras de acesso a dados: `src/hooks/use<Domínio>.ts`.
- Componentes e diálogos: `src/components/<área>/`.
- Lógica privilegiada e integrações: `supabase/functions/<nome>/index.ts`.
- Ferramentas MCP: `src/lib/mcp/`.
- Política de segredos: `docs/seguranca-segredos.md`.

---

## 9. Glossário (pt-BR)

| Termo | Significado |
| --- | --- |
| **OS** | Ordem de Serviço — unidade central de trabalho |
| **Medição** | Levantamento consolidado do que foi consumido/executado em uma OS, base do faturamento |
| **ISS "por dentro"** | Cálculo em que o imposto integra a própria base: `subtotal / (1 - taxa/100)` |
| **Docagem** | Serviço em estaleiro; OS-mãe com grupos de atividades filhos |
| **SGQ** | Sistema de Gestão da Qualidade (ISO 9001) |
| **NCR** | Não Conformidade / Non-Conformance Report |
| **ASO** | Atestado de Saúde Ocupacional |
| **EPI** | Equipamento de Proteção Individual |
| **DP** | Departamento Pessoal (folha, férias, ponto) |
| **OTA** | Over-The-Air — atualização do bundle web dentro do app nativo sem nova instalação |
| **RLS** | Row Level Security — filtro de acesso aplicado no banco |
| **Marina** | Assistente/copiloto de IA do Arrow |
