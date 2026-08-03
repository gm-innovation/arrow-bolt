# Corrigir "Erro ao abrir documento" nos documentos do colaborador (RH)

## Diagnóstico (confirmado)

O erro não está no arquivo nem na permissão do RH: está no **bucket errado**.

A tela de documentos do colaborador (aba "Documentos" do painel em `/hr/employees`) sempre pede o link assinado no bucket `corp-documents`. Mas a maioria dos documentos listados foi enviada originalmente pela ficha do técnico, e mora no bucket `technician-documents`.

Números reais da base hoje:

- 128 documentos registrados em `hr_employee_documents`
- 122 arquivos estão fisicamente em `technician-documents` (caminhos `.../aso/...` e `.../certifications/...`)
- apenas 6 estão em `corp-documents` (os enviados pela própria tela de RH)

Ou seja: praticamente todo ASO/NR antigo falha ao abrir, baixar e também ao excluir — inclusive o ASO do print. As permissões de leitura do RH nos dois buckets já existem e estão corretas.

## Correção proposta

1. **Registrar o bucket de cada documento**
   Adicionar a coluna `storage_bucket` em `hr_employee_documents` (texto, padrão `corp-documents`) e preencher retroativamente com o bucket onde o arquivo realmente está, consultando o inventário de arquivos. Novos envios gravam o bucket usado.

2. **Centralizar a resolução do arquivo**
   Criar um helper único (em `src/hooks/useHRDocumentCompliance.ts`) que gera o link assinado usando o bucket do registro e, se o arquivo não for encontrado, tenta o outro bucket como rede de segurança para registros antigos sem coluna preenchida.

3. **Aplicar o helper em todos os pontos que hoje assumem `corp-documents`**
   - `src/components/hr/EmployeeDetailSheet.tsx` — abrir/baixar (mensagem "Erro ao abrir documento") e excluir documento
   - `useDocumentFileUrl` (visualização em Conformidade / Meus Documentos)
   - `getSignedDocUrl` em `src/hooks/useHRDocumentSharing.ts` (compartilhamento com coordenadores, mantendo o log de acesso)

4. **Mensagens de erro mais úteis (pt-BR)**
   Em vez de "Erro ao abrir documento" genérico, exibir a causa quando conhecida (arquivo não encontrado x sem permissão), mantendo o padrão de toast do projeto.

## Detalhes técnicos

- Migração: `ALTER TABLE public.hr_employee_documents ADD COLUMN storage_bucket text NOT NULL DEFAULT 'corp-documents'` + `UPDATE` de backfill cruzando `file_path` com `storage.objects.name` para marcar os 122 registros como `technician-documents`. Sem mudança de RLS — as políticas atuais dos dois buckets já cobrem RH, admin e o próprio colaborador.
- A exclusão de documento passa a remover o objeto do bucket correto (hoje remove do bucket errado e falha silenciosamente, deixando arquivo órfão).
- Nenhuma alteração de política de segurança: continua valendo o isolamento por `company_id` e por pasta do técnico.
- Tipagem: os documentos passam a carregar `storage_bucket` no tipo usado pela aba de documentos, evitando `any` nos novos pontos.

## Verificação

Abrir o painel do colaborador do print, baixar o ASO e um NR antigo (arquivos em `technician-documents`) e um documento enviado pela própria tela de RH (em `corp-documents`) — os três devem abrir sem erro. Conferir também a visualização pela tela de Conformidade e pelo compartilhamento com coordenadores.
