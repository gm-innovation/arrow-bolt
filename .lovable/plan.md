## Diagnóstico

O campo de anexo de atestado **não existe** hoje — nem no formulário `NewAbsenceDialog.tsx` (só tem técnico, tipo, datas e motivo), nem na tabela `technician_absences` (não há coluna para URL/caminho do arquivo), nem em bucket dedicado. Portanto, não é problema de visibilidade condicional: a funcionalidade nunca foi implementada.

## Plano

### 1. Banco de dados
- Adicionar colunas à tabela `technician_absences`:
  - `attachment_url text` (caminho no storage)
  - `attachment_name text` (nome original do arquivo, para exibir)
- Migração não altera policies existentes (RLS de RH/técnico/admin continua válido).

### 2. Storage
- Criar bucket **privado** `absence-attachments` via `storage_create_bucket`.
- Policies em `storage.objects`:
  - Path padrão: `{company_id}/{technician_id}/{timestamp}-{arquivo}`.
  - RH da empresa: full manage.
  - Técnico: leitura apenas dos próprios atestados.
  - Admin/Director/Manager da empresa: leitura.

### 3. UI – `NewAbsenceDialog.tsx` e `EditAbsenceDialog.tsx`
- Adicionar campo condicional de upload que **só aparece quando `absence_type === 'sick_leave'`** (Atestado) e opcionalmente para `medical_exam`.
- Usar o padrão de upload nativo do projeto (input `opacity-0 absolute inset-0` sobre botão) — memória já registra esse padrão.
- Sanitização de nome de arquivo (função `sanitizeFilename` já existe no projeto).
- Aceitar PDF, JPG, PNG (máx. 10MB).
- Exibir nome do arquivo após seleção com botão "Remover".
- No submit: upload primeiro, gravar `attachment_url`/`attachment_name` no insert/update.
- Em modo edição: mostrar link/preview do anexo existente com botão para substituir ou remover.

### 4. Listagem – `AbsenceCalendar.tsx` / página `Absences.tsx`
- Nos cards/linhas de ausências do tipo Atestado, exibir ícone de clipe com link para signed URL do storage.
- Helper para gerar signed URL sob demanda (60 min).

### 5. Tipos
- Regenerar tipos após a migração para `CreateAbsenceData` (hook `useAbsences`) incluir os novos campos opcionais `attachment_url?`, `attachment_name?`.

### 6. i18n
- Todos textos em pt-BR: "Anexar atestado", "Selecionar arquivo", "Arquivo anexado", "Remover", "Baixar atestado".

## Fora do escopo
- Não altero fluxo de aprovação de ausências.
- Não mexo em RLS da tabela `technician_absences`.
- Não adiciono OCR/classificação automática — o anexo é apenas evidência.

## Confirmação
Confirma o escopo? Em especial: (a) manter o campo de upload **condicional a "Atestado"** (e possivelmente "Exame Médico"), ou deixar disponível para qualquer tipo de ausência? (b) tornar o anexo **obrigatório** quando o tipo for Atestado?