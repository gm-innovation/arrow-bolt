
# Manual do Módulo RH — Passo a Passo Ilustrado v1

Seguindo o mesmo padrão dos manuais Comercial/Marketing v3 e Coordenador v1 (Lecsor Technology, capa institucional, seções numeradas, screenshots com callouts, rodapé paginado).

## Escopo (23 rotas / 15 capítulos)

1. **Introdução** — papéis (`hr`, `director`, `super_admin`), fluxo geral, atalhos da sidebar
2. **Dashboard RH** (`/hr/dashboard`) — KPIs (headcount, ASO a vencer, aniversariantes, ausências)
3. **Colaboradores** (`/hr/employees`) — cadastro unificado, ficha (dados pessoais, endereço, `hire_date`, notas), edição, desligamento
4. **Ponto & Time Control** (`/hr/time-control`) — batidas, ajustes, aprovações
5. **Ausências, Feriados & Sobreaviso** (`/hr/absences`) — abas Ausências / Feriados / On-call
6. **Férias** (`/hr/vacations`) — períodos aquisitivos, nova solicitação, aprovação Gestor→RH, saldo, expiração automática (job diário)
7. **Exames de Saúde / ASO** (`/hr/health-exams`) — registro, upload, dashboard de vencimento, backfill legado
8. **EPI** (`/hr/epi`) — estoque, entregas, movimentações
9. **Documentos do Colaborador** (`/hr/documents`) + **Compliance por Cargo** (`/hr/document-compliance`) — catálogo, obrigatoriedade, revisões (`/hr/document-reviews`)
10. **Onboarding** (`/hr/onboarding` + `/settings`) — link público, checklist, tipos de documento
11. **Recrutamento & Seleção** (`/hr/recruitment`) — vagas, candidatos, tags, notas
12. **Parcerias e Benefícios** (`/hr/partnerships`) — convênios
13. **Exportação para Folha** (`/hr/payroll-export`) — consolidação mensal, XLSX/CSV
14. **Universidade Corporativa (visão RH)** (`/hr/university`) — cursos, trilhas, certificados, XP
15. **Configurações do RH** (`/hr/settings`) — hierarquia (`direct_manager_id`), catálogo de documentos, exames, feriados, benefícios
16. **Perfil e Assistente Marina** — `/hr/profile`, atalhos, uso do agente

Para cada capítulo: descrição funcional em prosa, passos numerados, print anotado (setas/retângulos vermelhos nas ações-chave), boxes de "Regras & Automatismos" (RLS, triggers, jobs pg_cron).

## Fluxo de execução

1. **Captura via Playwright** autenticado como usuário `hr` — ~30 screenshots (1280x1800), salvos em `/tmp/hr-manual/screens/`.
2. **Anotações** em cada print com PIL (setas vermelhas + numeração), sem tapar dados.
3. **Geração DOCX** com `docx-js` (Arial, headings customizados, tabela de papéis, capa Lecsor, rodapé "Manual RH v1 · Lecsor Technology · pág X").
4. **Conversão PDF** via LibreOffice; render de todas as páginas em JPG para QA visual.
5. **QA obrigatório** — inspecionar cada página, corrigir overflow/imagens quebradas e re-gerar.
6. **Entrega** em `/mnt/documents/Manual_RH_Passo_a_Passo_v1.pdf` e `.docx` com `<presentation-artifact>`.

## Identidade visual
- Capa preta com logo Lecsor + subtítulo "Módulo Recursos Humanos"
- Cor de destaque azul-marinho (#0F2A5C) para headings e callouts
- Rodapé com data 07/2026 e versão
- Tabela de papéis (RH · Diretor · Super Admin) e legenda de ícones

## Entregáveis
- `Manual_RH_Passo_a_Passo_v1.pdf` (~28 páginas)
- `Manual_RH_Passo_a_Passo_v1.docx` (fonte editável)
