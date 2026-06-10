
# Onda 1 — Passo 3 (v2): Geração automática de pendências de documentos por colaborador

Incorpora as três observações:
1. **Histórico de renovações** preservado via `is_current` + índice parcial único.
2. **`profiles.direct_manager_id`** — verificado: a coluna já existe no banco (`uuid`, nullable). Não precisa migration. A Edge Function trata `direct_manager_id IS NULL` como "notificar só o RH".
3. **Status `pending_review`** intermediário entre `missing` e `valid`, mesmo sem UI de aprovação nesta entrega.

## Objetivo
A partir do catálogo do Passo 2 e do cargo de cada colaborador (`profiles.position`), calcular automaticamente:
- documentos **faltando**, **aguardando revisão**, **válidos**, **a vencer**, **vencidos**;
- disparar **notificações in-app** ao colaborador, ao gestor direto e/ou ao RH conforme `responsible_role` do catálogo.

## Banco

### 1. Tabela `hr_employee_documents`
```text
- id, company_id, employee_id (FK profiles.id), catalog_id (FK hr_document_catalog.id)
- file_name, file_path, uploaded_at, uploaded_by
- issue_date (date, nullable)
- expiry_date (date, nullable) -- preenchido por trigger quando catálogo tem has_expiry e default_validity_months
- review_status (text: 'pending_review' | 'approved' | 'rejected')  default 'pending_review'
- reviewed_at (timestamptz, nullable), reviewed_by (uuid, nullable), rejection_reason (text, nullable)
- is_current (boolean, default true)
- notes (text, nullable)
- created_at, updated_at
```

Índice parcial único (preserva histórico):
```sql
CREATE UNIQUE INDEX hr_employee_documents_current_uq
  ON hr_employee_documents (employee_id, catalog_id)
  WHERE is_current = true;
```

Trigger `before insert`: se já existe linha com `(employee_id, catalog_id, is_current = true)`, marca a antiga como `is_current = false` antes de inserir a nova (sem violar o índice parcial).

Trigger `before insert/update`: calcula `expiry_date` quando o catálogo tem `has_expiry` e `default_validity_months`, baseado em `issue_date` ou `uploaded_at::date`.

### 2. Função `hr_employee_document_status(_company_id uuid)`
`SECURITY DEFINER`. Retorna por (colaborador, catálogo aplicável) o status derivado, usando **apenas** as linhas `is_current = true`:

| Situação                                              | `status`         |
|-------------------------------------------------------|------------------|
| Sem linha em `hr_employee_documents`                  | `missing`        |
| Linha com `review_status = 'rejected'`                | `missing`        |
| `review_status = 'pending_review'`                    | `pending_review` |
| `approved` + sem `expiry_date`                        | `valid`          |
| `approved` + `expiry_date < hoje`                     | `expired`        |
| `approved` + `expiry_date` dentro de `renewal_warning_days` | `expiring_soon` |
| `approved` + `expiry_date` no futuro fora da janela   | `valid`          |

Também devolve `due_in_days` e `responsible_role`.

Regra de aplicabilidade (igual ao Passo 2): `applies_to_all = true` → todos ativos; senão, casamento por `profiles.position` em `hr_document_catalog_positions`.

### 3. Auto-aprovação nesta entrega
Como ainda não há UI de revisão, um trigger marca `review_status = 'approved'` automaticamente quando uma linha é inserida **pelo RH/director/super_admin** (`uploaded_by` com essas roles via `has_role`). Quando o próprio colaborador envia, fica `pending_review` — Onda 2 adiciona a UI da Rayane para aprovar/rejeitar. Assim o status já reflete a realidade desde o dia 1 sem precisar alterar a tabela depois.

### 4. RLS
- `SELECT`: próprio colaborador, gestor direto, `hr`, `director`, `super_admin`.
- `INSERT/UPDATE/DELETE`: `hr`, `director`, `super_admin`, e o próprio colaborador (autoupload).
- GRANTs padrão para `authenticated` e `service_role` (sem `anon`).

### 5. Cron + Edge Function
- Edge Function `hr-document-compliance-check` (`verify_jwt = true` em `supabase/config.toml`).
- Cron diário via `pg_cron` registrado com `supabase--insert` (carrega anon key).
- Para cada empresa:
  - Roda `hr_employee_document_status`.
  - Para cada pendência (`missing | pending_review | expiring_soon | expired`), insere `notifications`:
    - **Colaborador**: sempre, sobre seu próprio documento.
    - **Gestor direto** (`profiles.direct_manager_id`): quando `responsible_role` ∈ `direct_manager | both` **e** `direct_manager_id IS NOT NULL`.
    - **RH** (usuários com role `hr`): quando `responsible_role` ∈ `hr | both`, **ou** quando `responsible_role = direct_manager` e o colaborador não tem gestor direto (fallback explícito para não perder o aviso).
  - Deduplica: não cria nova notificação se já existe uma não lida com mesmo `reference_id = hr_employee_documents.id || catalog_id` nas últimas 24h.

## Front-end

1. **Hook `useHRDocumentCompliance.ts`**
   - `useComplianceOverview()` — RPC `hr_employee_document_status`, agregada por colaborador.
   - `useEmployeeDocuments(employeeId)` — lista `is_current = true` + status calculado; opção de incluir histórico (`is_current = false`).
   - `useUploadEmployeeDocument()` — upload no bucket `corp-documents`, path `{company_id}/employees/{employee_id}/{catalog_code}/{ts}_{safe_name}`, insere em `hr_employee_documents` (trigger cuida do `is_current` antigo).

2. **Página `src/pages/hr/DocumentCompliance.tsx`** (rota nova `/hr/document-compliance`)
   - Cards: total colaboradores, % conforme, # faltantes, # aguardando revisão, # a vencer, # vencidos.
   - Tabela de colaboradores com filtros (cargo, status, responsável).
   - Drawer ao clicar: lista dos requisitos aplicáveis com status e ações **Enviar/Substituir** ou **Visualizar**; aba "Histórico" mostra versões antigas (`is_current = false`).

3. **Menu lateral RH** (`DashboardLayout.tsx`): item **"Conformidade Documental"** abaixo de "Configurações".

4. **Sino de notificações**: sem mudança de UI; passa a receber as novas entradas.

## Fora do escopo
- UI de aprovação/rejeição pelo RH (Onda 2) — o status `pending_review` já existe.
- E-mail e WhatsApp (Passo 4).
- Preferências de canal/silenciar por usuário.
- Migração de `technician_documents` legados.

## Ordem de execução
1. Migração: `hr_employee_documents` + índice parcial único + triggers (`is_current`, `expiry_date`, auto-approve por role) + RLS + função `hr_employee_document_status` + GRANTs.
2. Edge Function `hr-document-compliance-check` + bloco no `config.toml`.
3. Cron diário via `supabase--insert`.
4. Hook + página `DocumentCompliance` + item de menu.

Posso seguir?
