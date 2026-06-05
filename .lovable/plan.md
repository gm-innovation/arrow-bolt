
# Sprint 3.4 — Matriz de Competência (versão final, aprovada)

Ajustes finais aplicados:
- **RPC dedicada `quality_accept_auto_suggestion(p_user_id, p_competency_id)`** zera `manual_override`, define `current_level := auto_suggested_level`, registra `assessed_by = auth.uid()` e `last_assessed_at = now()`. Botão "Aceitar auto-sugestão" chama essa RPC (não faz UPDATE direto).
- **Role `qualidade` confirmada no enum `app_role`**. Master = `super_admin | director | coordinator | qualidade` em todas as RLS, helpers e checagens de função.

Demais decisões já confirmadas:
- Manual prevalece quando `current_level > auto_suggested_level` (campo `manual_override` + badge "M↑" no heatmap).
- Trigger de `university_enrollments` com `WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')`.
- Adicionar tokens `success`/`warning` ao design system antes do heatmap.

---

## 0. Design system (pré-requisito do heatmap)
- **`src/index.css`** (`:root` e `.dark`): variáveis `--success`, `--success-foreground`, `--success-soft`, `--success-soft-foreground`, `--warning`, `--warning-foreground`, `--warning-soft`, `--warning-soft-foreground` (HSL).
- **`tailwind.config.ts`**: registrar `success` e `warning` (com `DEFAULT`, `foreground`, `soft`, `soft-foreground`) em `extend.colors`.
- **`src/components/ui/badge.tsx`**: variantes `success`/`warning` passam a usar os tokens (`bg-success-soft text-success-soft-foreground`, etc.).

---

## 1. Banco de dados (1 migration)

### Enums
- `quality_competency_level`: `none`(0) / `basic`(1) / `intermediate`(2) / `advanced`(3) / `expert`(4).
- `quality_competency_category`: `technical | behavioral | regulatory | safety | management`.
- `quality_evidence_type`: `university_course | university_trail | hr_certificate | acknowledgement | manual`.

### Helper de permissão
```sql
CREATE OR REPLACE FUNCTION public.quality_is_master(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'super_admin')
      OR public.has_role(_user_id, 'director')
      OR public.has_role(_user_id, 'coordinator')
      OR public.has_role(_user_id, 'qualidade')
$$;
```

### Tabelas (todas com `company_id`, RLS, GRANTs `authenticated` + `service_role`)
- **`quality_competencies`** — `name`, `description`, `category`, `active`. Master CRUD; demais SELECT na empresa.
- **`quality_role_requirements`** — `role app_role`, `competency_id`, `required_level`, `is_mandatory`, `notes`. UNIQUE`(company_id, role, competency_id)`. Master CRUD; demais SELECT.
- **`quality_user_competencies`** — `user_id`, `competency_id`, `current_level`, `manual_override boolean DEFAULT false`, `auto_suggested_level`, `auto_suggestion_reason`, `last_assessed_at`, `assessed_by`, `assessment_notes`. UNIQUE`(company_id, user_id, competency_id)`. RLS: usuário lê próprio; Master CRUD na empresa.
- **`quality_competency_evidences`** — `user_competency_id`, `evidence_type`, `source_id`, `source_label`, `evidence_date`, `level_contribution`. RLS: usuário lê próprias; Master vê tudo na empresa.
- **`quality_competency_mappings`** — `competency_id`, `evidence_type`, `source_id`, `grants_level`. UNIQUE`(company_id, competency_id, evidence_type, source_id)`. Master CRUD; demais SELECT.
- **`quality_training_plans`** — `user_id`, `competency_id`, `current_level`, `required_level`, `target_level`, `status` (`proposed|in_progress|completed|cancelled`), `due_date`, `responsible_id`, `notes`, `linked_course_id`, `linked_trail_id`, `auto_generated`, `generated_at`, `completed_at`, `completed_evidence_id`. RLS: colaborador lê seus; Master CRUD na empresa; `responsible_id` pode atualizar status do próprio plano.

### Funções (`SECURITY DEFINER` + `SET search_path = public`)
- **`quality_recompute_user_competency(p_user_id, p_competency_id)`** — varre `quality_competency_mappings`, valida evidências reais (`university_enrollments` completed, trilhas com todos os cursos completos, `technician_documents` ativos/válidos, `quality_signature_events` com `action='acknowledgment'`), calcula `auto_suggested_level = MAX(grants_level válidos)`. UPSERT em `quality_user_competencies`: se `manual_override = true AND current_level >= auto_suggested_level`, mantém manual; caso contrário `current_level := auto_suggested_level` e `manual_override := false`. Reescreve `quality_competency_evidences` da linha.
- **`quality_recompute_user_competencies_all(p_user_id)`** — loop sobre competências mapeadas.
- **`quality_set_manual_level(p_user_id, p_competency_id, p_level, p_notes)`** — checa `quality_is_master(auth.uid())`; UPSERT com `manual_override = true`, `current_level = p_level`, `assessed_by = auth.uid()`, `last_assessed_at = now()`.
- **`quality_accept_auto_suggestion(p_user_id, p_competency_id)`** — checa Master OU `auth.uid() = p_user_id`; lê `auto_suggested_level` atual; UPDATE `manual_override = false`, `current_level = auto_suggested_level`, `assessed_by = auth.uid()`, `last_assessed_at = now()`, `assessment_notes = 'Aceito auto-sugestão por evidências'`. Erro se a linha não existir.
- **`quality_generate_training_plans(p_user_id)`** — idempotente; cria plans `proposed` apenas para gaps positivos sem plano ativo; preenche `linked_course_id`/`linked_trail_id` a partir dos mappings; insere uma `notification` por plano.

### Triggers
- `AFTER INSERT ON university_enrollments` WHEN (`NEW.status = 'completed'`) → `quality_recompute_user_competencies_all(NEW.user_id)`.
- `AFTER UPDATE ON university_enrollments` **WHEN (`NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed'`)** → mesma RPC.
- `AFTER INSERT ON quality_signature_events` WHEN (`NEW.action = 'acknowledgment'`) → recomputa para `NEW.user_id`.
- `AFTER INSERT OR UPDATE ON technician_documents` → resolve `user_id` via `technicians` e recomputa.

### View
- **`quality_competency_matrix_v`** (security_invoker) — `profiles × user_roles × quality_role_requirements × quality_user_competencies` (LEFT JOIN). Colunas: `company_id, user_id, full_name, role, competency_id, competency_name, category, required_level, current_level, manual_override, auto_suggested_level, gap, is_mandatory`.

---

## 2. Frontend

### Hooks (`src/hooks/`)
- `useQualityCompetencies.ts` — CRUD catálogo.
- `useQualityRoleRequirements.ts` — CRUD + `requirementsForRole(role)`.
- `useQualityCompetencyMappings.ts` — CRUD; combos de cursos/trilhas/tipos de documento.
- `useQualityMatrix.ts` — leitura da view + filtros (role/categoria/só-gaps); mutações `setManualLevel` (RPC `quality_set_manual_level`), `acceptAutoSuggestion` (RPC `quality_accept_auto_suggestion`), `recompute(user_id)` (RPC `quality_recompute_user_competencies_all`).
- `useQualityTrainingPlans.ts` — `mine`/`all`, `generate(user_id)` (RPC), `updateStatus`, `cancel`, `linkCourse`.

### Páginas
- `src/pages/quality/CompetencyMatrix.tsx` (`/quality/competencies`) — 4 tabs: **Matriz** (heatmap), **Competências** (catálogo), **Requisitos por Cargo**, **Mapeamentos**.
- `src/pages/quality/MyCompetencies.tsx` (`/quality/my-competencies`) — tabs **Meu mapa** + **Meu plano**.

### Componentes (`src/components/quality/`)
- `CompetencyMatrixHeatmap.tsx` — `Table` com sticky-col; cores por gap:
  - `gap = 0` → `bg-success-soft text-success-soft-foreground`
  - `gap = 1` → `bg-warning-soft text-warning-soft-foreground`
  - `gap ≥ 2` ou mandatório faltante → `bg-destructive/15 text-destructive`
  - Badge "M↑" + tooltip quando `manual_override AND current_level > auto_suggested_level`.
- `CompetencyAssessmentDrawer.tsx` — Select de nível, textarea de notas, botão **Aceitar auto-sugestão** (chama RPC dedicada), lista de evidências.
- `TrainingPlanCard.tsx` — status, link curso/trilha, ações (concluir/cancelar/vincular curso).
- `RoleRequirementEditor.tsx` — grid editável role × competência.
- `CompetencyMappingDialog.tsx` — Select tipo de evidência → Combobox da fonte → nível outorgado.

### Edições pontuais
- `src/App.tsx` — rotas lazy `/quality/competencies` e `/quality/my-competencies`.
- `src/components/DashboardLayout.tsx` — `qualidadeMenuItems`: "Matriz de Competência" (`GraduationCap`) e "Minhas Competências" (`Target`).
- `src/pages/quality/Dashboard.tsx` — cards "Conformidade da Matriz" (% mandatórios atendidos) e "Gaps críticos" (count gap ≥2 em mandatórios), ambos linkando para `/quality/competencies`.

---

## 3. Permissões (consolidado)
| Ação | Roles permitidas |
|---|---|
| CRUD catálogo / requisitos / mapeamentos | `super_admin`, `director`, `coordinator`, `qualidade` |
| `quality_set_manual_level` | Master (acima) |
| `quality_accept_auto_suggestion` | Master OU o próprio `user_id` |
| `quality_generate_training_plans` | Master (manual) + execução automática via gatilho |
| Ver matriz completa da empresa | Master |
| Ver própria linha + planos | qualquer `authenticated` da empresa |
| Marcar plano concluído | Master OU `responsible_id` do plano |

---

## 4. Notas técnicas
- Migration única: 3 enums + 6 tabelas + GRANTs + RLS + helper `quality_is_master` + 5 funções de domínio + 4 triggers + 1 view.
- Toda escrita em `quality_user_competencies` originada de evidência passa por `quality_recompute_user_competency` (auditável via `quality_competency_evidences`).
- Tipos da Supabase serão regenerados após a migration; uso provisório de `as any` em `from(...)`/`rpc(...)`.
- Sem novos buckets, sem novas edge functions.
- Notificação criada para cada plano gerado.

## Fora de escopo
- Autoavaliação com workflow de validação do gestor.
- Re-avaliação periódica programada.
- Importação CSV da matriz.
- Exportação PDF para auditoria.

Ordem de execução ao entrar em build: **migration → design tokens → hooks → componentes → páginas → edições pontuais**.
