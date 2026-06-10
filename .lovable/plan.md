## Problema

Ao criar um documento em `quality_documents`, o Postgres retorna `infinite recursion detected in policy for relation "quality_documents"`.

A causa é um ciclo entre policies:

- `quality_documents.qd_docs_permissioned_read` faz subselect em `quality_document_permissions`.
- `quality_document_permissions.qd_perms_master_full` faz subselect em `quality_documents`.
- `quality_document_versions.*` e `quality_document_approvals.*` também fazem subselect em `quality_documents`.

Quando o INSERT em `quality_documents` retorna a linha, o PostgREST avalia as policies de SELECT, que entram em `quality_document_permissions`, cuja policy volta para `quality_documents` → recursão.

## Solução

Quebrar o ciclo com funções `SECURITY DEFINER` que ignoram RLS para resolver "qual a empresa deste documento" e "este usuário pode ver este documento".

### Funções novas (SECURITY DEFINER, search_path=public)

- `quality_doc_company_id(_doc_id uuid) returns uuid` — retorna `company_id` direto de `quality_documents` sem RLS.
- `quality_doc_user_can_view(_doc_id uuid, _user uuid) returns boolean` — true se o doc é publicado e (widely_visible OR existe permissão em `quality_document_permissions` com `can_view=true`).

### Policies reescritas

- `quality_documents.qd_docs_permissioned_read`: passa a usar `quality_doc_user_can_view(id, auth.uid())` em vez de subselect.
- `quality_document_permissions.qd_perms_master_full` (USING/WITH CHECK): troca o subselect em `quality_documents` por `quality_doc_company_id(document_id) IN (SELECT company_id FROM profiles WHERE id = auth.uid())`.
- `quality_document_versions.qd_versions_master_full`, `qd_versions_director_read`, `qd_versions_visible_read`: idem, usando `quality_doc_company_id(document_id)` e `quality_doc_user_can_view(document_id, auth.uid())`.
- `quality_document_approvals.qd_approvals_master_full`, `qd_approvals_director_read`: o `version_id` resolve `document_id` em `quality_document_versions` (sem RLS via SECURITY DEFINER helper `quality_version_company_id(_version_id)`).

### Nenhuma mudança no frontend

O hook `useQualityDocuments` e o modal "Novo Documento" continuam iguais. Só RLS muda.

### Verificação

Após a migration, abrir o modal e criar um documento — não deve mais aparecer o erro de recursão; a linha deve voltar do INSERT com `returning`.
