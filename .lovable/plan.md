## Onde estamos

Concluído no módulo Qualidade:
- **Fase 0** — bug da fila de aprovação central (erro agora aparece na UI).
- **Fase 1.1** — Responsável pelo documento.
- **Fase 1.2** — Cópia Controlada com overlay dinâmico no `PDFCanvasViewer`.
- **Fase 1.7** — Autorização Master reforçada no banco (25 tabelas do SGQ).

## Próximos passos (ordem sugerida)

### 1. Fase 1.3 — Editar "Próxima revisão" na Nova Versão (rápido, ~1 passo)
- Adicionar campo opcional **"Próxima revisão"** no diálogo `NewVersionDialog`.
- Se preenchido, a publicação usa a data informada; se em branco, recalcula pelo ciclo do SGQ (`document_review_months`).
- Fecha o loop com o botão "Recalcular" já existente.

### 2. Fase 2 — Compartilhamento e Upload

**1.4 Compartilhamento (Interno + Link Público com token)** — o item mais denso da Fase 2:
- Migration: tabela `quality_document_public_links` (token, expiração, max_uses, revogação, contador de acessos).
- Edge Function `quality-public-doc` (verify_jwt=false) validando token + status do documento em tempo real, retornando signed URL de 5 min.
- Rota pública `/q/:token` fora do `ProtectedRoute`, usando `PDFCanvasViewer` + `ControlledCopyOverlay`.
- Botão "Compartilhar" no detalhe do documento: link interno (copia URL) e link público (gera token, mostra expiração, permite revogar).
- Restrito a `qualidade`/`super_admin`; confirmação extra em documentos "restritos".

**1.5 Upload ampliado**:
- Ajustar MIME allow-list do bucket `quality-documents` para aceitar `.doc/.docx/.xls/.xlsx/.ppt/.pptx/.odt/.csv` + PDF + imagens; limite 50 MB.
- Corrigir o filtro do upload da **primeira versão** no `NewDocumentDialog` (hoje só aceita PDF).
- Para Office em modo controlado: botão "Baixar" com aviso de cópia controlada + log em `quality_document_access_log`.

### 3. Onda 4 — Conscientização (fecha a Fase 2)
- Combobox multi-select de colaboradores no diálogo "Registrar Evento" de conscientização.
- Persistir participantes em `quality_awareness_attendees`.
- Notificação in-app para cada participante marcado.

### Depois (Fase 3 e 4, quando concluirmos a Fase 2)
- Fase 3: Contexto (páginas em árvore), SWOT por Departamento, Partes Interessadas com categoria livre, Processos com N documentos e view `quality_process_health`.
- Fase 4: reorganização de menus — Provedores → Suprimentos, Calibração → Metrologia.

## Recomendação

Fazer **1.3 primeiro** (é curto e destrava o fluxo de nova versão) e, na sequência, entrar na **Fase 2** começando por **1.5 (upload Office)** — que é a queixa recorrente da Qualidade — antes de atacar **1.4 (link público)**, que é o item mais complexo por envolver edge function e rota pública.

## Perguntas antes de seguir

1. Confirma essa ordem (**1.3 → 1.5 → 1.4 → Onda 4**) ou prefere priorizar o **link público (1.4)** primeiro?
2. No **link público**: default de expiração (ex.: 7 dias) e limite de acessos (ex.: 50) — usar esses valores ou definir outros?
3. Na **Onda 4 (Conscientização)**: além de participantes internos, precisa suportar "participantes externos" via texto livre (ex.: cliente auditando)?
