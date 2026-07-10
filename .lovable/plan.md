## Plano: Testes e Revisão do Módulo de RH

Executar auditoria E2E autenticada como usuário com papel `hr` cobrindo todas as rotas `/hr/*`, capturando erros de console, rede (HTTP ≥400), crashes de UI e regressões funcionais — mesmo padrão usado no módulo do Coordenador.

### Escopo de rotas
- `/hr/dashboard` — KPIs e widgets
- `/hr/employees` + ficha do colaborador (`EmployeeDetailSheet`)
- `/hr/settings` — Hierarquia, Cargos, Departamentos, Catálogo de Documentos
- `/hr/document-compliance` — Conformidade documental
- `/hr/document-reviews` — Aprovação de documentos
- `/hr/documents` — GED do RH
- `/hr/health-exams` — SST/ASO
- `/hr/vacations` — Férias (períodos + solicitações)
- `/hr/payroll-export` — Exportação para folha
- `/hr/time-control` — Ponto e ajustes
- `/hr/epi` — EPIs
- `/hr/on-call` — Sobreaviso
- `/hr/onboarding` + `/hr/onboarding-settings`
- `/hr/partnerships` — Convênios
- `/hr/reports` — Relatórios
- `/hr/profile`

### Metodologia
1. **Login E2E** com sessão injetada (`LOVABLE_BROWSER_SUPABASE_*`) como usuário `hr`.
2. **Playwright headless** navegando rota a rota:
   - Screenshot de cada tela.
   - Captura de `console.error`, `pageerror` e responses HTTP ≥400.
   - Interações-chave: abrir modais principais, aplicar filtros, alternar abas.
3. **Fluxos críticos** (interação real):
   - Criar/editar colaborador → salvar `hire_date`.
   - Gerar período aquisitivo → nova solicitação de férias → aprovação.
   - Registrar exame ASO + upload.
   - Marcar documento como revisado em `/hr/document-reviews`.
   - Rodar `hr-payroll-export` para o mês corrente.
   - Editar hierarquia em `/hr/settings` (trigger anti-ciclo).
4. **Verificações transversais**:
   - Datas sem shift UTC (`formatLocalDate` aplicado).
   - RLS: papel `hr` acessa somente sua empresa.
   - Nenhum `TabsContent` órfão (bug recorrente).
   - Notificações da Edge `hr-document-compliance-check` chegando.
5. **Consolidação**: tabela por rota com status ✅ / ⚠️ / ❌, evidências (screenshots + trechos de erro), causa provável e recomendação.

### Correções neste turno
- Bugs **bloqueantes** (crash, 500, RLS quebrada, dado errado exibido) → corrijo imediatamente.
- Bugs **cosméticos / melhorias** → listo como backlog priorizado para você decidir.

### Entregável
Relatório em chat com:
- Resumo executivo (nº rotas OK / com issues).
- Tabela detalhada por rota.
- Lista de fixes aplicados + lista de pendências recomendadas.
- Nenhum manual gerado nesta rodada (foco em QA).

### Detalhes técnicos
- Scripts Playwright em `/tmp/hr-qa/` (fora do checkout).
- Viewport `1280x1800`, `headless=True`.
- Session restore via `LOVABLE_BROWSER_SUPABASE_SESSION_JSON` + cookies antes de qualquer `goto` autenticado.
- Login atual (`/hr/dashboard`) confirma sessão `hr` ativa — aproveito a sessão já injetada.
