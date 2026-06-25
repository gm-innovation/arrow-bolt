# Correções no Módulo de Documentos da Qualidade

## Problemas identificados

1. **Próxima revisão não bate com a publicação** (ex.: publicado 25/06/2026, revisão "20/06/2026" — anterior à publicação). Hoje o campo `next_review_date` é preenchido apenas na criação do documento e nunca recalculado quando uma nova versão é publicada, nem permite edição posterior.
2. **Documento marcado como "Obsoleto" indevidamente.** O botão "Marcar obsoleto" fica visível e acionável sem confirmação, sem checagem de validade e sem possibilidade de reverter — qualquer clique acidental tornou o documento obsoleto (caso da "Política da Qualidade", com 1 versão e já obsoleto).
3. **Upload restrito** a `.pdf, .doc, .docx`. Faltam formatos comuns do dia a dia (planilhas, imagens, apresentações, texto).
4. **Sem campo de edição** para corrigir metadados (próxima revisão, classificação, visibilidade) depois de criado.

## O que será feito

### 1. Edição de metadados pós-criação
Adicionar diálogo **"Editar metadados"** no cabeçalho da página de detalhe do documento, acessível para `qualidade`, `director` e `coordinator`. Campos editáveis:
- Título
- Classificação (interno/cliente/etc.)
- **Próxima revisão** (date picker, com validação obrigatória > `published_at`)
- Referência normativa
- Visibilidade (restrita/ampliada)

A edição grava em `quality_documents` via `update` do hook existente — sem mudanças de schema.

### 2. Cálculo automático correto da próxima revisão
- Adicionar setting **`document_review_months`** em `quality_settings.review_cycles` (default: **12 meses**), editável em `/quality/settings`.
- No fluxo `approveAndPublish` (em `useQualityDocuments.ts`):
  - Definir `published_at = now()`.
  - Recalcular `next_review_date = published_at + document_review_months` **sempre**, sobrescrevendo o valor antigo (a menos que o usuário tenha editado manualmente na mesma sessão de publicação — nesse caso, manter o valor manual se for posterior a `published_at`).
- Garantir uso de `date-fns` (`addMonths` + `format(..., 'yyyy-MM-dd')`) para evitar deslocamento de timezone.

### 3. Obsolescência protegida
- Trocar o botão "Marcar obsoleto" por um `AlertDialog` de confirmação explicando: "Esta ação retira o documento de circulação e marca todas as versões publicadas como obsoletas. Não pode ser desfeita pela interface."
- Adicionar ação **"Reativar documento"** (visível quando `status='obsolete'`) que volta o documento para `published` e restaura a última versão publicada — apenas para `qualidade`/`director`.
- Não há job automático que marca obsoleto; o problema relatado veio do clique direto. A confirmação resolve o caso prático.

### 4. Upload de arquivos ampliado
Substituir o `accept=".pdf,.doc,.docx"` por lista que cobre os formatos usados no SGQ:
- PDF: `.pdf`
- Word: `.doc, .docx`
- Excel: `.xls, .xlsx, .csv`
- PowerPoint: `.ppt, .pptx`
- Texto: `.txt, .rtf, .odt`
- Imagens: `.png, .jpg, .jpeg, .webp`

Validar tamanho máximo (ex.: 50 MB) com toast amigável antes de enviar para o storage.

## Arquivos afetados

- `src/pages/quality/DocumentDetail.tsx` — botão de editar metadados, AlertDialog de obsoleto, ação de reativar, novo `accept` do input.
- `src/components/quality/EditDocumentMetadataDialog.tsx` (novo).
- `src/hooks/useQualityDocuments.ts` — `approveAndPublish` calcula `next_review_date`; novo mutation `reactivate`.
- `src/hooks/useQualitySettings.ts` — incluir `document_review_months` nos defaults/tipos.
- `src/pages/quality/Settings.tsx` (ou aba existente) — input para o ciclo de revisão de documentos.

## Fora de escopo (registrar para próxima rodada)
O usuário mencionou "várias outras coisas". Após estas correções, levantar lista completa com a Qualidade (ex.: cópias controladas, watermarks, fluxo de aprovação multi-aprovador, exportação) e tratar em onda seguinte.
