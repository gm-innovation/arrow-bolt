# Anexos de Auditoria — upload real de arquivos

## Diagnóstico (confirmado)

O drawer `AuditAttachmentsDrawer.tsx` não tem upload de arquivo — ele exige que o usuário digite manualmente um **Nome do arquivo** e uma **URL** (`https://...`) para poder salvar. Como a Rayane (perfil `qualidade`) não tem como gerar essa URL, o botão "Adicionar" fica inativo/sem efeito e ela não consegue anexar nada. Não é bug de RLS nem de tipo de arquivo — é a UI que simplesmente nunca chamou o Storage.

Evidências:
- `src/components/quality/AuditAttachmentsDrawer.tsx`: campos `file_name` + `file_url` como `Input` de texto; sem `<input type="file">`.
- `src/hooks/useQualityAuditAttachments.ts`: `add` insere direto em `quality_audit_attachments` com o `file_url` recebido — nunca faz upload.
- RLS `qaa_write` já libera `qualidade`/`director`/`super_admin` da mesma empresa da auditoria — está correta.
- Buckets existentes: `quality-evidences` (privado) é o candidato natural.

## O que construir

1. **Upload real no drawer**
   - Substituir o formulário atual por uma área de upload (botão + drag-and-drop) usando `<input type="file">` sobreposto (padrão do projeto: `opacity-0 absolute inset-0`).
   - Aceitar PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, CSV, TXT, PNG, JPG/JPEG, WEBP.
   - Limite: 25 MB por arquivo (validado no front, com toast claro em pt-BR quando exceder ou tipo não permitido).
   - Manter os campos **Tipo** (plan/evidence/report/photo/other) e **Notas**.

2. **Fluxo de upload (front)**
   - Sanitizar nome de arquivo (helper já existente no projeto — remover acentos/espaços) e prefixar com timestamp para evitar colisão.
   - Path no Storage: `quality-evidences/audits/{audit_id}/{timestamp}_{sanitized_name}`.
   - Após `supabase.storage.from('quality-evidences').upload(...)`, gerar `createSignedUrl` (7 dias) só para exibição/download imediato, mas **persistir no banco o `storage_path`**, não a URL assinada.

3. **Ajuste de dados**
   - Adicionar coluna `storage_path text` em `quality_audit_attachments` (migration). Manter `file_url` para compatibilidade com registros antigos (nullable).
   - Hook `useQualityAuditAttachments`: inserir `storage_path` no `add`; no `remove`, apagar também o objeto do bucket via `storage.remove([storage_path])`.
   - Listagem: se houver `storage_path`, gerar `createSignedUrl` sob demanda ao clicar; fallback para `file_url` legado.

4. **RLS de Storage**
   - Adicionar policies em `storage.objects` para o bucket `quality-evidences` permitindo `INSERT/SELECT/DELETE` a `authenticated` cujo `has_role` seja `qualidade`/`director`/`super_admin` e cujo caminho comece com `audits/`. Sem grants extras em tabela — as policies da tabela já cobrem.

5. **Feedback ao usuário (pt-BR)**
   - Toasts: "Enviando arquivo…", "Anexo adicionado", "Falha no upload: {motivo}", "Tipo não suportado", "Arquivo excede 25 MB".
   - Barra/spinner de progresso enquanto envia; desabilitar o botão durante o envio.

## Fora de escopo

- Não mexer em `NewAuditDialog`, listagem de auditorias, nem em outros módulos.
- Não alterar RLS da tabela `quality_audit_attachments` (já está correta).
- Sem alteração de i18n global — mensagens ficam no próprio componente.

## Arquivos que serão tocados

- `src/components/quality/AuditAttachmentsDrawer.tsx` — nova UI de upload.
- `src/hooks/useQualityAuditAttachments.ts` — upload + signed URL + delete no Storage.
- Migration nova: coluna `storage_path` + policies do bucket `quality-evidences`.

## Validação

- Logar como usuário `qualidade` da mesma empresa da auditoria, anexar um PDF e um DOCX, conferir que aparecem na lista, que o link abre e que o `Remove` apaga o objeto do bucket.
- Tentar arquivo > 25 MB e tipo `.exe` → toasts de erro claros.
- Logar como usuário sem papel de qualidade → botão de anexar bloqueado / erro amigável.
