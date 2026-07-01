## Onde estamos

Fases concluídas do módulo Qualidade:
- **Fase 0** — bug da fila de aprovação central
- **Fase 1.1** — Responsável pelo documento
- **Fase 1.2** — Cópia Controlada (marca d'água dinâmica)
- **Fase 1.3** — Override da "Próxima revisão" na publicação
- **Fase 1.4** — Compartilhamento por link público (`/q/:token`)
- **Fase 1.7** — Autorização Master reforçada no banco

Ainda pendentes do plano original: **Fase 1.5** (upload Office ampliado), **Onda 4** (conscientização já tem base, falta polimento), **Fase 3** (Contexto/SWOT/Partes Interessadas/Processos), **Fase 4** (reorganização de menus). E há o **módulo de RH** com Ondas 2–5 ainda em aberto.

## Próximos passos sugeridos (ordem)

### 1. Fase 1.5 — Upload ampliado (curto, alta demanda)
- Ampliar MIME allow-list do bucket `quality-documents`: `.doc/.docx/.xls/.xlsx/.ppt/.pptx/.odt/.csv` + PDF + imagens; limite 50 MB.
- Corrigir o filtro do upload da **primeira versão** no `NewDocumentDialog` (hoje só aceita PDF).
- Para arquivos Office em modo **cópia controlada**: botão "Baixar" com aviso e log em `quality_document_access_log`.

### 2. Onda 4 — Fechamento de Conscientização
A base já existe (`quality_awareness_events` + `quality_awareness_attendees` + `AwarenessFormDialog`). Falta:
- Notificação in-app automática ao participante ao ser adicionado.
- Botão de **"Confirmar ciência"** (preenche `acknowledged_at`) para o colaborador na área "Minha Conta".
- Suporte a **participantes externos** por texto livre (ex.: cliente auditando) — nova coluna `external_attendees jsonb` no evento.
- Coluna "% ciência" na listagem de eventos.

### 3. Fase 3 — Contexto Organizacional (mais denso, ISO §4)
- Páginas em árvore para `quality_context_items` (Contexto Interno/Externo).
- **SWOT por Departamento** com versionamento em `quality_context_versions`.
- Partes Interessadas com categoria livre.
- Processos com N documentos vinculados e view `quality_process_health`.

### 4. Fase 4 — Reorganização de menus
- Provedores Externos → **Suprimentos**
- Calibração → **Metrologia**
- Ajustes de sidebar e rotas com redirect legado.

### Alternativa: retornar ao RH
Se preferir pausar Qualidade, retomamos a **Onda 2 do RH**: contratos de experiência, fluxo de desligamento, benefícios, SST (acidentes/CAT/NR).

## Recomendação

Ir por **1.5 → Onda 4 → Fase 3 → Fase 4**, fechando o módulo Qualidade antes de voltar para o RH.

## Perguntas antes de seguir

1. Confirma a ordem **1.5 → Onda 4 → Fase 3 → Fase 4**, ou prefere pausar Qualidade e retomar a **Onda 2 do RH**?
2. Na **Fase 1.5**, para arquivos Office em modo controlado: bloquear preview e forçar download com aviso, ou permitir preview via conversão para PDF (mais caro)?
3. Na **Onda 4**, os participantes externos entram como texto livre simples (nome + empresa), ou precisam também de e-mail para futuro envio de confirmação?
