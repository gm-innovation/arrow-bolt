## Plano: Auditoria e testes end-to-end do módulo de RH

Objetivo: percorrer todas as rotas, hooks e fluxos de RH, verificando integridade de dados, RLS, UI e regressões, no mesmo padrão da auditoria feita em Comercial/Marketing.

### 1. Auditoria de banco (via read_query)
- **Hierarquia & cargos**: checar `profiles.direct_manager_id` (ciclos, órfãos, gestores desligados) e `position` vs catálogo.
- **Catálogo documental**: `hr_document_catalog` + `hr_document_catalog_positions` (documentos sem cargo, cargos sem documentos obrigatórios).
- **Documentos de colaboradores**: `hr_employee_documents` — registros órfãos, `review_status` inconsistente, arquivos ausentes no storage `corp-documents`.
- **Compliance RPC**: rodar `hr_employee_document_status` e `hr_pending_reviews` para a company real e conferir contagens.
- **Recrutamento**: `job_openings`, `job_applications`, `job_application_notes`, tags e assignments — órfãos, RLS, notificações `request_created` residuais fora de RH/Diretoria (repetir a limpeza feita para Cahua se surgirem novos casos).
- **Ponto/ausências/EPI/parcerias/on-call/onboarding**: `time_entries`, `hr_time_adjustments`, `technician_absences`, `epi_*`, `hr_partnerships`, `technician_on_call`, `employee_onboarding`, `onboarding_documents` — integridade referencial e RLS.
- **Departamentos**: `departments` + `department_members` — usuários sem departamento, membros duplicados.
- **Papéis**: usuários com role `hr` ativos; garantir que o espelho `commercial` do Marketing não vaze permissões de RH.

### 2. Testes de rota (Playwright headless, sessão HR injetada)
Percorrer cada rota, capturar screenshot, ler console/network:
```
/hr/dashboard
/hr/documents
/hr/document-compliance
/hr/document-reviews
/hr/settings              (hierarquia, cargos, catálogo, departamentos)
/hr/onboarding
/hr/onboarding-settings
/hr/time-control
/hr/epi
/hr/on-call
/hr/partnerships
/hr/reports
/hr/profile
/corp/my-documents        (visão colaborador)
```

### 3. Fluxos funcionais críticos (validação visível em tela)
1. **Compliance**: abrir dashboard, filtrar por status, abrir gaveta de um colaborador, validar cores/contadores contra RPC.
2. **Revisão documental**: aprovar e rejeitar um upload de teste, verificar propagação para `my-documents` do colaborador e limpeza de notificação.
3. **Hierarquia**: alterar gestor direto de um colaborador, confirmar trigger anti-ciclo e refresh do combobox.
4. **Catálogo**: criar documento obrigatório vinculado a cargo, subir arquivo pelo portal do colaborador, ver aparecer na fila de revisão.
5. **Recrutamento**: abrir vaga, enviar candidatura pública (rota `/onboarding/publica` ou form existente), ver notificação chegar só em RH/Diretoria.
6. **Ponto**: abrir controle de ponto, lançar ajuste, verificar aprovação.
7. **EPI/On-call/Parcerias**: criar 1 registro em cada e confirmar listagem + RLS (usuário fora do RH não vê).
8. **Onboarding**: gerar link público, abrir em contexto anônimo, subir 1 documento, aprovar no admin.

### 4. Correções aplicadas na hora
- Bugs de UI simples (keys, z-index de dialog, pointer-events, `useState` que não sincroniza com query assíncrona — mesmo padrão do fix do SIPOC).
- Limpeza de notificações estagnadas (`notifications` de tipos de RH em caixas de não-RH).
- Ajustes de RLS/GRANT se aparecer "permission denied" em alguma tabela hr_*.
- Regressões maiores viram nota no relatório final, não são corrigidas sem confirmação.

### 5. Entregável
Relatório resumido por área com: rotas OK, achados de dados, correções aplicadas, itens que ficam pendentes de decisão do usuário.

### Detalhes técnicos
- Playwright via shell em `/tmp/browser/hr-audit/`, viewport 1280×1800, sessão Supabase injetada via env.
- Consultas somente-leitura via `supabase--read_query`; qualquer alteração de schema/limpeza vai por `supabase--migration` com descrição em português.
- Edições de código apenas com `line_replace`/`write` em arquivos já lidos; nenhum retrabalho de business logic sem sinal claro de bug.
