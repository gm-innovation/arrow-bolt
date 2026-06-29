## Contexto

Investiguei o documento `001 – pr teste`. Ele está obsoleto porque alguém clicou em **"Marcar como obsoleto"** em 26/06/2026 12:53 — não há automação fazendo isso e a `next_review_date` (25/06/2027) ainda está válida. Hoje a ação é um clique simples, sem registro de quem fez, sem motivo e sem restrição de role.

## O que vou implementar

### 1. Banco — log de auditoria + motivo

Migration:

- Adicionar em `quality_documents`:
  - `obsolete_by uuid` (referência ao usuário que marcou)
  - `obsolete_reason text`
- Nova tabela `quality_document_status_log` (histórico de transições):
  - `document_id`, `from_status`, `to_status`, `reason`, `changed_by`, `created_at`
  - GRANT `SELECT, INSERT` para `authenticated`, `ALL` para `service_role`
  - RLS: leitura para quem já enxerga o documento (via `quality_doc_user_can_view`); inserção apenas pelo próprio usuário (`changed_by = auth.uid()`)
- Trigger `AFTER UPDATE OF status` em `quality_documents` que insere automaticamente uma linha em `quality_document_status_log` sempre que o status muda, capturando `obsolete_reason` quando a transição vai para `obsolete`.

### 2. Restrição de role (servidor)

Na mesma migration, ajustar a policy de UPDATE de `quality_documents` para que transições para `obsolete` só sejam permitidas quando `has_role(auth.uid(),'qualidade')` OR `has_role(auth.uid(),'director')` OR `has_role(auth.uid(),'super_admin')`. Demais updates seguem a política atual. Isso garante a regra mesmo se a UI for contornada.

### 3. Frontend — diálogo com motivo obrigatório

- `src/pages/quality/DocumentDetail.tsx`: substituir o `AlertDialog` atual de confirmação por um `Dialog` com `Textarea` de **Motivo (obrigatório, mín. 10 caracteres)**. Botão desabilitado até preencher.
- `src/hooks/useQualityDocuments.ts`: `markObsolete` passa a aceitar `{ reason: string }` e gravar `obsolete_reason` + `obsolete_by = user.id` na mesma update. Só exibir o botão "Marcar como obsoleto" se `role ∈ {qualidade, director, super_admin}`.
- Aba **Histórico** (`DocumentHistoryTimeline.tsx`): exibir as entradas de `quality_document_status_log` (quem mudou, de/para, motivo, data) intercaladas com os eventos atuais.

### 4. Este documento específico

Não vou reativar automaticamente — você pediu para não reativar agora. O botão **"Reativar documento"** continua disponível na tela quando você quiser.

## Detalhes técnicos

```text
quality_documents
  + obsolete_by         uuid
  + obsolete_reason     text

quality_document_status_log
  id, document_id, from_status, to_status,
  reason, changed_by, created_at
```

Roles permitidos para marcar obsoleto: `qualidade`, `director`, `super_admin` (alinhado com o padrão do SGQ — coordenadores e gestores deixam de ter essa capacidade).

## Fora do escopo

- Reativação automática do `pr teste`.
- Notificações in-app/e-mail ao marcar obsoleto (posso adicionar depois se quiser).
- Workflow de aprovação dupla para obsolescência.