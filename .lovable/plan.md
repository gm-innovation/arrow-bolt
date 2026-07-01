
# Correções no Módulo de Qualidade — SGQ (v3, final)

Incorpora as recomendações técnicas sobre visualizador com overlay confiável e link público com revalidação em tempo real.

---

## Fase 0 — 🔴 Bug bloqueante (PRIORIDADE ZERO)

### 1.6 Erro na fila de aprovação (`/quality/document-reviews`)
- Reproduzir com Playwright, inspecionar console/network.
- Corrigir a query/RLS/hook responsável (`usePendingReviews`) para que a fila carregue sem erro.
- Envolver a página em `ErrorBoundary` local com mensagem amigável e botão "Recarregar".
- Testar com role `qualidade` e `super_admin`.

---

## Fase 1 — Governança de Documentos

### 1.1 Responsável pelo documento
- Migration: `quality_documents.responsible_user_id uuid REFERENCES profiles(id)`.
- Combobox de colaboradores em Novo Documento e edição de metadados.
- Exibir "Responsável" na listagem e no cabeçalho do detalhe.

### 1.2 Cópia Controlada — governança de ponta a ponta ⚠️

**Modelo**
- Migration:
  - `quality_document_types.default_control_mode text CHECK IN ('controlled','uncontrolled')` — default `controlled`.
  - `quality_documents.control_mode text` — herda do tipo se `NULL`, editável no documento.
- UI: Select **"Cópia Controlada / Não Controlada"** separado da classificação (Confidencial/Interno/Restrito/Público).

**Overlay dinâmico no visualizador** (com ressalva técnica) 🔒
- Requisito: overlay CSS só funciona sobre canvas do mesmo domínio — `<iframe>` e Google Viewer bloqueiam por CSP/X-Frame-Options.
- Regra: **todo preview de PDF/imagem no módulo Qualidade passa por `PDFCanvasViewer` (pdfjs em canvas)** ou por `<img>` nativo. Nada de `<iframe src="...pdf">` nem Office Viewer embutido para documentos com `control_mode = controlled`.
- Auditar e remover usos de iframe restantes (fila de revisão, detalhe do documento, self-service em `/corp/my-documents`, cópias controladas).
- Novo `<ControlledCopyOverlay mode={mode} code rev user />`:
  - `position: absolute; inset: 0; pointer-events: none;` sobre o container do canvas.
  - Marca d'água diagonal repetida:
    - `controlled` → vermelho translúcido `rgba(220,38,38,0.12)` — texto "CÓPIA CONTROLADA".
    - `uncontrolled` → cinza escuro — "CÓPIA NÃO CONTROLADA".
    - `obsolete` → vermelho escuro — "OBSOLETO".
  - Rodapé fixo (dentro do container do viewer, não do PDF): `{code} Rev. {rev} · Impresso em {data} por {usuário}`.
- Para downloads/impressão, o PDF gerado por `QualityDocumentPDF` / `ControlledDocPage` já embute watermark — corrigir o mapeamento para receber o `control_mode` real.
- Word/Excel/PowerPoint: **não temos como injetar overlay no binário nem no preview externo**. Nesses casos, mostrar apenas botão "Baixar" com aviso "Cópia controlada — não redistribuir" e registrar acesso em `quality_document_access_log`.

### 1.3 Alterar próxima revisão em nova versão
- Campo opcional "Próxima revisão" no diálogo "Nova Versão" (default = publicação + ciclo em `quality_settings.review_cycles.document_review_months`).
- Publicação respeita o valor informado; em branco recalcula. Botão "Recalcular" existente permanece.

### 1.7 Autorização Master — reforço no BANCO 🔒
Regra: se está fora da UI, deve estar fora da API.

Migration reescreve policies UPDATE/DELETE das tabelas abaixo com `has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'super_admin')`:
- Contexto: `quality_context_items`, `quality_context_versions`.
- Partes Interessadas: `quality_interested_parties`, `quality_interested_party_evidences`.
- Objetivos: `quality_objectives`, `quality_objective_parties`, `quality_objective_risks`.
- Riscos: `quality_risks`, `quality_risk_actions`, `quality_risk_events`.
- Processos: `quality_processes`, `quality_process_activities`, `quality_process_sipoc`.
- Normas: `quality_reference_norms`, `quality_document_norms`.
- Comunicação: `quality_communication_plan`, `quality_communication_log`.
- Conscientização: `quality_awareness_events`, `quality_awareness_attendees`.
- Análise Crítica: `quality_management_reviews` e filhas.
- Homologação, Melhorias.

Frontend libera botões Editar/Excluir só após confirmar a policy.

---

## Fase 2 — Resto da Onda 1 + Onda 4

### 1.4 Compartilhamento (Interno + Público com token) 🔒
- Botão "Compartilhar" no detalhe:
  - **Link interno**: copia `/quality/documents/:id`.
  - **Link público**: nova tabela `quality_document_public_links`:
    - `id uuid`, `document_id`, `token uuid UNIQUE DEFAULT gen_random_uuid()`, `expires_at timestamptz NOT NULL`, `max_uses int`, `access_count int DEFAULT 0`, `revoked_at timestamptz`, `created_by`, `created_at`.
    - Índice em `token` e em `expires_at` (para varredura de expirados).
- Edge Function `quality-public-doc` (verify_jwt = false) — **valida em tempo real**:
  1. Token existe, `revoked_at IS NULL`, `expires_at > now()`, `access_count < max_uses` (se definido).
  2. Documento existe, `status NOT IN ('obsolete','archived')` e não foi soft-deleted.
  3. Tipo de documento não desativado.
  4. Incrementa `access_count`, grava em `quality_document_access_log` (IP, user-agent, `context.public_token`).
  5. Retorna signed URL de 5 min do storage + metadados.
- Rota pública `/q/:token` fora do `ProtectedRoute`, renderiza no `PDFCanvasViewer` + `ControlledCopyOverlay` (com `mode` do documento).
- Botão "Revogar link" no detalhe (marca `revoked_at`); lista de links ativos com contador de acessos.
- Apenas `qualidade`/`super_admin` geram links; documentos "restritos" pedem confirmação extra.

### 1.5 Upload ampliado
- MIME allow-list do bucket `quality-documents`: `.doc, .docx, .xls, .xlsx, .ppt, .pptx, .odt, .csv`, PDF e imagens; 50 MB.
- Corrigir filtro do upload de **primeira versão** dentro do "Novo Documento" (hoje só PDF).
- Office → botão "Baixar" com aviso de cópia controlada (ver 1.2).

### Onda 4 — Conscientização
- Combobox multi-select de colaboradores no diálogo "Registrar Evento".
- Persistir em `quality_awareness_attendees`.
- Notificação in-app para cada participante.

---

## Fase 3 — Contexto, Partes Interessadas e Processos

### 2.1 Novas páginas de Contexto (menu em árvore)
Análise Competitiva, Análises Críticas (link), Escopo do SGQ, Gestão das Partes Interessadas (link), Identidade Organizacional, Objetivos Estratégicos, Política da Qualidade (link). Cada uma é um `quality_context_item` com `slug` fixo + rich-text versionado.

### 2.2 SWOT por Departamento
Nova tabela `quality_department_swot (department_id, quadrant, description, priority, created_by)` e página `/quality/context/swot` com matriz 2×2.

### 2.3 Partes Interessadas — categoria livre
Texto livre com sugestões; remove `NOT NULL`/enum.

### 2.4 Processos — N documentos vinculados
- Nova tabela `quality_process_documents (process_id, document_id, is_required, PK composta)`.
- Drawer passa a listar N chips + "Adicionar documento".
- Validação: processo é ativo se todos os documentos `is_required` estiverem publicados e dentro da validade.

### 2.5 Painel — Processos com Indicador de Disponibilidade ⚠️
- View SQL `quality_process_health` (SECURITY INVOKER) consolida status por processo:
  - `Conforme`: todos os docs obrigatórios publicados + válidos.
  - `Alerta`: algum doc a vencer ≤30 dias ou em revisão.
  - `Não Conforme`: algum doc vencido/obsoleto/ausente.
- Dashboard `/quality/dashboard` ganha seção "Processos" com cards clicáveis (docs vinculados, riscos abertos, ações, indicadores fora da meta).

---

## Fase 4 — Reorganização de Menus

### 3.1 Provedores → Suprimentos
Mover item; RLS de `quality_suppliers` recebe roles `supplies`/`compras`. Qualidade mantém leitura.

### 3.2 Calibração → menu "Metrologia"
Confirmar com o usuário: nova role `metrologia` ou atribuição direta ao Renan? Qualidade mantém leitura.

---

## Detalhes técnicos consolidados

**Banco**
- Colunas: `quality_documents.responsible_user_id`, `quality_documents.control_mode`; `quality_document_types.default_control_mode`.
- Tabelas: `quality_document_public_links`, `quality_department_swot`, `quality_process_documents`.
- View: `quality_process_health`.
- Migration única reescrevendo policies UPDATE/DELETE das tabelas da Fase 1.7.

**Storage**
- `quality-documents`: MIME allow-list ampliada, limite 50 MB.

**Frontend**
- `<ControlledCopyOverlay>` reutilizado no `PDFCanvasViewer`, `<img>` nativo e página pública `/q/:token`.
- Hook `useDocumentControlMode(documentId)` resolve `document.control_mode ?? type.default_control_mode ?? 'controlled'`.
- Auditoria: remover todo `<iframe>` de preview de PDF do módulo Qualidade.
- Sidebar Qualidade ganha submenu "Contexto".

**Edge Function**
- `quality-public-doc` — valida token + status do documento em tempo real, incrementa contador, registra acesso, devolve signed URL curta.

---

## Ordem final

1. **Fase 0** — bug da fila.
2. **Fase 1** — 1.1 → 1.2 (com overlay + auditoria de iframes) → 1.3 → 1.7 (RLS na mesma migration).
3. **Fase 2** — 1.4, 1.5, Onda 4.
4. **Fase 3** — 2.1, 2.3, 2.4, 2.5, 2.2.
5. **Fase 4** — 3.1, 3.2.

## Fora deste plano

- Itens "7 para baixo" da página 4 do PDF — aguardando lista.
- Notificações e-mail/WhatsApp de vencimento de docs vinculados a processos (candidato à Onda 5).
