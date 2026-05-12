# Módulo de Recrutamento (RH)

Como o site é um sistema separado, recomendo a opção mais robusta: **criar uma página pública de candidatura hospedada neste app** (igual ao padrão de Onboarding e public-lead-intake). O CTA "Saiba mais" do site passa a apontar para essa URL. Como bônus, exponho uma **API pública** para o site enviar candidaturas via formulário próprio se preferirem mais tarde — assim você cobre os dois cenários sem retrabalho.

## 1. Banco de dados

Três tabelas novas + bucket de storage:

- **`job_openings`** (vagas)
  - `title`, `area`, `description`, `location`, `employment_type`, `is_active`, `company_id`
  - RH cadastra/edita; lista pública vê só `is_active = true`
- **`job_applications`** (candidaturas)
  - `company_id`, `job_opening_id` (nullable → espontânea), `full_name`, `email`, `phone`, `city`, `state`, `linkedin_url`, `salary_expectation`, `availability`, `cover_letter`, `cv_file_url`, `cv_file_name`, `area_of_interest`, `status` (`new` / `screening` / `interview` / `approved` / `rejected` / `hired`), `source` (`site` / `manual`), `notes` (jsonb p/ histórico), `reviewed_by`, `reviewed_at`
- **`job_application_notes`** (notas internas do RH em cada candidato)

Bucket de storage privado **`recruitment-cvs`** com path `{company_id}/{application_id}/{filename}`.

**RLS:** RH/Diretor leem e atualizam tudo da empresa; insert público via Edge Function (service role); candidatos não enxergam nada. Bucket fechado, acesso só por signed URL.

## 2. Edge Function pública

`supabase/functions/public-job-application/index.ts` — mesmo padrão de `public-lead-intake`:

- valida payload com Zod (honeypot, rate-limit por IP, tamanho do CV ≤ 5MB, mime PDF/DOC/DOCX)
- resolve empresa por `public_site_slug`
- salva o CV no bucket via service-role
- insere em `job_applications` com `source='site'` e `status='new'`
- retorna `{ ok: true, id }`

`verify_jwt = false` no `config.toml`.

Endpoint: `POST {SUPABASE_URL}/functions/v1/public-job-application`

## 3. Página pública de candidatura

Rota: `/carreiras/:slug` (e `/carreiras/:slug/:vagaId` para vaga específica).

Reaproveita o visual da landing pública (mesma identidade do CTA enviado):
- Header com logo da empresa
- Lista de vagas abertas (cards) + botão "Candidatura espontânea"
- Formulário (campos completos) + upload de CV (drag & drop)
- Confirmação ao enviar
- Sem autenticação

O time pode apontar o CTA "Saiba mais" do site para `https://arrow.googlemarineinnovation.com.br/carreiras/{slug}`.

## 4. Área no RH

Nova entrada na sidebar do RH: **"Recrutamento"** com 2 abas:

**Aba "Vagas"** (`/hr/recruitment/jobs`)
- Tabela de vagas com toggle ativa/pausada
- Modal de criar/editar vaga
- Contador de candidatos por vaga

**Aba "Candidatos"** (`/hr/recruitment` — default)
- Lista filtrável (vaga, status, área, busca por nome/email)
- Colunas: Nome, Vaga, Área, Cidade, Recebido em, Status (badge)
- Click → **Sheet de detalhes**:
  - Dados pessoais + link LinkedIn
  - Pretensão / disponibilidade / carta
  - Botão "Baixar CV" e preview (PDF via `PDFCanvasViewer`)
  - Mudança de status (dropdown)
  - Notas internas (timeline) com `useMutation`
  - **Botão "Converter em Admissão"** → quando status = `approved`, abre o `NewEmployeeForm` (pré-preenchido com nome/email/telefone) e ao salvar dispara o fluxo existente de Onboarding, vincula `application_id` no processo criado e marca candidato como `hired`.

## 5. Notificações

Trigger `on_new_job_application` cria notificação para todos os usuários com role `hr` da empresa ("Novo currículo recebido — {nome}").

---

## Detalhes técnicos

- Reaproveita: `useNotifications`, `PDFCanvasViewer`, padrão `useOnboarding`, padrão `public-lead-intake`, `NewEmployeeForm`.
- Sanitização de nome de arquivo (memory: filename-sanitization).
- Validação Zod client + server.
- Status workflow:

```text
new → screening → interview → approved → hired
                              ↘ rejected
```

- Sem mudança no schema de `employee_onboarding` — apenas adicionar coluna opcional `job_application_id uuid` para rastrear origem.
- Toasts com `onError` em react-hook-form (memory: form-validation-error-feedback).
- Combobox para vagas (memory: large-table-fetching).

## Entregáveis

1. Migration (3 tabelas + bucket + RLS + trigger de notificação + coluna em `employee_onboarding`)
2. Edge Function `public-job-application` registrada em `config.toml`
3. Página pública `/carreiras/:slug` (+ rota no `App.tsx`)
4. `src/pages/hr/Recruitment.tsx` + `RecruitmentJobs.tsx` + componentes (`ApplicationDetailSheet`, `JobOpeningDialog`, `NewJobApplicationDialog` para entrada manual)
5. Hook `useRecruitment.ts` (vagas + candidaturas + notas)
6. Item "Recrutamento" na sidebar do RH (`DashboardLayout`)
