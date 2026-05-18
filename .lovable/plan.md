
## Objetivo
Permitir que o RH marque candidaturas com tags coloridas, filtre/encontre rapidamente por tags e notas, e extraia automaticamente informações do currículo (PDF/imagem) via IA.

## 1. Sistema de Tags (marcações)

**Banco (migration):**
- Nova tabela `job_application_tags`: `id`, `company_id`, `name`, `color` (hex), `created_by`. RLS: visíveis/editáveis por RH/Diretor/Coordinator da empresa.
- Nova tabela `job_application_tag_assignments`: `application_id`, `tag_id`, `assigned_by`, `assigned_at`. Unique (application_id, tag_id). RLS análoga.
- Coluna `has_notes` derivada via view ou simplesmente contar notas no front (já existe `job_application_notes`).

**UI:**
- Em `ApplicationDetailSheet`: nova seção "Marcações" com chips coloridos das tags atribuídas, popover para adicionar/criar tags (autocomplete com cor).
- Em `Recruitment.tsx` (aba Candidatos):
  - Nova coluna "Marcações" na tabela mostrando os chips (até 3, com +N).
  - Indicador visual quando há notas internas (ícone de comentário com contagem).
  - Novo filtro multi-select de tags ao lado dos filtros de status/vaga.
  - Toggle "Apenas com notas".
  - Busca já existente continuará por nome/email.
- Nova aba/seção "Gerenciar marcações" (modal) para criar/editar/excluir tags da empresa.

## 2. Extração de currículo via IA

**Edge function nova `extract-cv-data`:**
- Recebe `application_id` (RLS-friendly via service role) ou `fileBase64`+`fileName`.
- Baixa o CV do bucket `recruitment-cvs` (se PDF, converte 1ª página a imagem no client — seguindo padrão `useCertificateExtraction`/`useDocumentExtraction`).
- Chama Lovable AI (`google/gemini-2.5-flash`) com tool-calling para extrair: nome, email, telefone, cidade/estado, resumo profissional, anos de experiência, formação (lista), experiências (lista de cargo/empresa/período), idiomas, skills.
- Retorna JSON estruturado.

**UI:**
- Em `ApplicationDetailSheet`: botão "Extrair dados do currículo" (visível quando há `cv_file_url`). Mostra spinner durante extração.
- Resultado exibido em nova seção "Currículo analisado" (formação, experiências, skills como chips, resumo). Persistido em coluna `cv_extracted_data jsonb` em `job_applications` para não reprocessar.
- Skills extraídas podem ser sugeridas como tags com um clique ("Adicionar como marcação").

## 3. Hook
- Estender `useRecruitment.ts` com: `useApplicationTags()`, `useAssignTag()`, `useRemoveTag()`, `useExtractCv()`.

## Arquivos afetados
- Migration nova (tabelas + RLS + coluna `cv_extracted_data`)
- `supabase/functions/extract-cv-data/index.ts` (nova)
- `supabase/config.toml` (registrar function com `verify_jwt = true`)
- `src/hooks/useRecruitment.ts`
- `src/pages/hr/Recruitment.tsx` (coluna tags, filtros, indicador de notas)
- `src/components/hr/ApplicationDetailSheet.tsx` (seção tags + extração CV)
- `src/components/hr/TagManagerDialog.tsx` (novo)
- `src/components/hr/TagPicker.tsx` (novo, popover com criação rápida)

## Fora do escopo
- Não altera fluxo público de candidatura nem o site externo.
- Não mexe em Admissões/Onboarding.
