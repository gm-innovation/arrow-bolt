## Plano aprovado — SGQ rodada v2 (continuação)

Executarei em 3 rodadas sequenciais. Cada rodada é entregue para você validar antes da próxima.

### Rodada A — GED (rápida, sem novas tabelas)

**A1. Data de próxima revisão editável ao subir nova versão** (Item 3 do PDF)
- Em `DocumentDetail.tsx`: adicionar campo `Input type="date"` "Próxima revisão (opcional)" no bloco de upload de nova versão.
- Passar o valor como `nextReviewDateOverride` para `approveAndPublish` (parâmetro já existe no hook).
- Se vazio → mantém cálculo automático via `document_review_months`.

**A2. Perfil Master — override total no GED** (Item 9)
- Auditar policies de `quality_documents`, `quality_document_versions`, `quality_document_permissions` e garantir que `is_quality_master(company_id)` libere UPDATE/DELETE sem depender de `can_edit`.
- Adicionar botão "Excluir documento" (soft delete → status `deleted` ou `obsolete` forçado, com registro em `quality_document_status_log`) visível somente ao Master em `DocumentDetail.tsx`.

### Rodada B — Upload em Normas (Item 5)

- Verificar colunas de `quality_reference_norms`; se faltar `file_path`/`file_name`/`file_mime`/`file_size`, migração adiciona.
- Criar bucket privado `quality-norms` via `supabase--storage_create_bucket`.
- Policies em `storage.objects` restritas por `company_id` (path pattern `{company_id}/{norm_id}/...`).
- Componente de upload no drawer/form de norma, reutilizando padrão do GED (Word/Excel/PDF/imagens, limite 50MB, sanitização de filename).
- Botão "Visualizar" abrindo `PDFCanvasViewer` ou fallback para download.

### Rodada C — Contexto e Processos (paralela)

**C1. Contexto da Organização — Hub** (Item 6)
- Nova rota `/quality/context` (ou reaproveitar `competencies-hub?tab=org` transformando em hub próprio).
- Cards/links para: Identidade Organizacional, Política da Qualidade (link), Objetivos Estratégicos (link), Escopo, Análise SWOT, Partes Interessadas (link), Análises Críticas (link).
- **Subpágina "Identidade Organizacional"** (nova, escopo desta rodada): Missão / Visão / Valores editáveis pelo Master. Armazenar em `quality_org_context` (já existe, 14 colunas — reaproveitar) ou nova tabela `quality_org_identity` se conflitar.
- **Filtro por setor no SWOT** existente: adicionar `department_id` opcional em `quality_context_items` + Select de filtro na UI.
- Demais itens do print: apenas link para as páginas já existentes.

**C2. Processos com múltiplos documentos vinculados** (Item 7)
- Nova tabela `quality_process_documents`:
  - `process_id` (FK)
  - `document_id` (FK)
  - `relationship_type` enum: `input` (entrada), `output` (saída), `reference` (referência), `procedure` (procedimento aplicável)
  - timestamps + `created_by`
- Migrar dados existentes se `quality_processes` tiver coluna única atual de documento.
- UI:
  - Selector múltiplo de documentos + tipo de relação no editor de processo.
  - Aba/seção "Documentos vinculados" no Painel do Processo agrupada por tipo.
- Manter compatibilidade: policies espelham as de `quality_processes`.

### Ordem de execução
1. Rodada A (curta) → validação
2. Rodada B (bucket + upload) → validação
3. Rodada C1 e C2 juntas → validação
4. Só depois disso, avançar para §7+ do roadmap ISO.

### Fora de escopo desta rodada
- Notificações por E-mail/WhatsApp (Onda 2 do módulo RH original).
- Módulo Renan (setor não existe).
- Marketing/Feed integrado com SGQ.

Confirma para eu iniciar pela **Rodada A**?
