# Diagnóstico — Permissões do usuário Qualidade

Auditoria completa: guards de rota (frontend), itens de sidebar, policies RLS em ~50 tabelas `quality_*` + tabelas corp/profiles, hooks e edge functions.

**Resumo executivo:** o role `qualidade` tem acesso correto às rotas `/quality/*` e às configurações base do SGQ, mas está **silenciosamente bloqueado por RLS em 4 dos módulos operacionais mais críticos do SGQ** — Homologação, Voz do Cliente (campanhas/convites/respostas/reclamações), Análise Crítica da Direção, e Melhorias. As páginas existem no menu e abrem normalmente, mas devolvem listas vazias ou erro ao gravar, porque as policies dessas tabelas listam `director`, `coordinator`, `super_admin` e esqueceram de incluir `qualidade` (foram criadas antes desse role virar perfil oficial do SGQ). Também faltam dois itens no menu da Qualidade: **Meus Documentos** e **Perfil**.

---

## A. Acesso de rota (frontend)

Tudo correto, **exceto um caso**:

| Rota | Status |
|---|---|
| `/quality/*` (30+ subrotas) | ✅ |
| `/corp/feed`, `/corp/dashboard`, `/corp/documents`, `/corp/my-documents`, `/corp/university`, `/corp/profile`, `/corp/requests` | ✅ |
| `/account/settings` | ✅ |
| **`/corp/reports`** | ❌ Bloqueado por `CorpReportsLayoutRoute` (`['super_admin','hr','director']`) — `src/components/corp/CorpRoute.tsx:78` |

## B. Sidebar (menu lateral do role qualidade)

`src/components/DashboardLayout.tsx:261-344` — itens **faltando** vs outros roles:

- **Meus Documentos** (link para `/corp/my-documents`) — rota funciona, mas não há item de menu. Colaborador qualidade fica sem acesso visível aos próprios documentos obrigatórios.
- **Perfil** (link para `/quality/profile`) — a rota está declarada em `App.tsx:472` mas não há entrada no sidebar.

## C. RLS — restrições indevidas por tabela

### 🔴 Críticas (módulo inacessível mesmo com a tela aberta)

| Tabela | Policies que excluem `qualidade` | Operações afetadas |
|---|---|---|
| `quality_homologations` | `Quality leaders can view/insert/update`, `Directors can delete` | SELECT, INSERT, UPDATE, DELETE |
| `quality_complaints` | `sgq read complaints`, `sgq manage complaints` | SELECT + ALL |
| `quality_satisfaction_campaigns` | `sgq read campaigns`, `sgq manage campaigns` | SELECT + ALL |
| `quality_satisfaction_invites` | `sgq manage invites` | ALL |
| `quality_satisfaction_responses` | `sgq read responses`, `sgq manage responses` | SELECT + ALL |
| `quality_management_reviews` | `mr_insert/update/delete_director` | INSERT, UPDATE, DELETE (SELECT é por company) |
| `quality_management_review_participants` | `mrp_insert`, `mrp_delete` | INSERT, DELETE |
| `quality_management_review_inputs` | `mri_all` | ALL |
| `quality_management_review_outputs` | `mro_all` | ALL |
| `quality_improvements_manual` | `qim_select_own_or_privileged`, `qim_update_privileged`, `qim_delete_privileged` | SELECT agregado, UPDATE, DELETE |

Em todas: `director`, `coordinator` e/ou `super_admin` estão listados — `qualidade` foi esquecido.

### 🟡 Possivelmente indevida

- `profiles` — policy `"Privileged roles can view company profiles"` (`super_admin`, `hr`, `admin`, `director`) não inclui `qualidade`. Qualidade depende da view `profiles_public` (id/nome/avatar). Suficiente para listar responsáveis, mas pode faltar email/cargo/departamento em telas como atribuição de auditorias e NCRs.

### ✅ Sem problema (intencional)

`university_*` (gestão = HR), `hr_employee_documents`, `finance_*`, `measurements/*`, `user_roles`, edge functions de gestão de usuários. `notifications.INSERT` já inclui qualidade. Todas as tabelas-base do SGQ (`quality_documents`, `_versions`, `_permissions`, `_settings`, `_org_context`, `_interested_parties`, `_terms`, `_reference_norms`, NCRs, auditorias, riscos, etc.) já incluem `qualidade` corretamente.

## D. Hooks e Edge Functions

Nenhuma checagem client-side de role bloqueando `qualidade`. Os hooks confiam 100% na RLS — por isso o sintoma percebido é "página vazia / botão Salvar dá erro silencioso", em vez de "Acesso negado".

---

## E. Plano de correção sugerido (próximo passo, se você aprovar)

Quando você aprovar este diagnóstico, eu preparo **uma única migration** que:

1. Adiciona `has_role(auth.uid(), 'qualidade')` (em `OR` com os roles existentes) nas 17 policies listadas em C.🔴, mantendo todas as outras condições (company_id, etc.) intactas.
2. Adiciona `'qualidade'` à policy `"Privileged roles can view company profiles"` em `profiles`.
3. Inclui `'qualidade'` em `CorpReportsLayoutRoute` (frontend, `src/components/corp/CorpRoute.tsx:78`).
4. Adiciona ao `qualidadeMenuItems` em `DashboardLayout.tsx`:
   - "Meus Documentos" → `/corp/my-documents` (ícone `FileText`)
   - "Perfil" → `/quality/profile` (ícone `User`)

Sem mudar nenhuma policy onde `qualidade` já está, sem afetar outros roles, sem schema/migrations de dados.

Quer que eu siga com essa correção, ou prefere recortar (ex: só o RLS, deixar sidebar pra depois)?
