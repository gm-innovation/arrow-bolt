# Auditoria de fotos em duas etapas: legenda primeiro, visão só no que faltar

## Causa raiz confirmada

O Auvo **já envia legenda** em cada foto. No payload bruto de `auvo_tasks.raw_payload.attachments` cada anexo tem `subtitle` preenchido pelo técnico — por exemplo "contêiner Gyro#3 antes da limpeza", "troca do impelidor Gyro#3", "troca de vedações Gyro #3".

A ingestão descarta isso: o normalizador em `auvo-sync/auvo.ts` grava apenas `{ url, name: a.name }`, e `name` não existe no Auvo — por isso todos os anexos em `auvo_task_reports.attachments` estão com `"name": null`. A auditoria recebe uma lista de GUIDs de arquivo e, seguindo o próprio prompt, aponta lacuna em tudo. As 13 fotos do print existem e estão legendadas; o sistema é que nunca leu a legenda.

## Etapa 1 — Aproveitar a legenda que já existe (sem custo de visão)

1. Passar a capturar `subtitle` e `description` de cada anexo na ingestão, além da URL, e classificar o tipo de anexo (foto x assinatura x documento).
2. Recuperar as legendas dos atendimentos já importados a partir de `auvo_tasks.raw_payload` — sem nova chamada ao Auvo e sem IA. Onde o payload bruto não tiver o anexo, uma re-sincronização pontual do período preenche.
3. A auditoria de texto passa a confrontar o relatório com as **legendas reais**, com régua conservadora: legenda que cite o equipamento ou a etapa da atividade vale como evidência; só aponta lacuna quando nenhuma legenda cobre a atividade.
4. Reprocessar apenas os relatórios hoje marcados como `gaps` — a maioria deve zerar já nesta etapa, sem custo de visão. Decisões humanas já registradas são preservadas.

## Etapa 2 — Visão computacional, só quando não houver legenda

Roda **apenas** para o subconjunto que sobrar da Etapa 1, e apenas nas fotos sem legenda:

- Gatilho: relatório com lacunas apontadas **e** ao menos uma foto sem `subtitle`.
- Legenda automática só das fotos sem legenda, em uma única chamada multimodal por atendimento (limite de 12 imagens), com pedido de descrição curta (1 linha por foto).
- A legenda gerada é gravada e reaproveitada: nenhuma foto é enviada à visão duas vezes, mesmo em reprocessamentos futuros.
- Se a visão cobrir a atividade, a lacuna é removida automaticamente; o que sobrar vira apontamento com a nota de que nem legenda nem imagem evidenciam a atividade.

## Economia de tokens

- Etapa 1 é texto puro, sobre legendas curtas — mais barata que o prompt atual, que já mandava o relatório inteiro.
- Visão só no resíduo e só nas fotos sem legenda, uma chamada por atendimento, cacheada.
- Relatório sem texto ou sem foto continua resolvido por regra, sem IA.
- Fila em lotes, com orçamento por execução, aproveitando a barra de progresso já existente.

## Revisão humana

Cada lacuna passa a mostrar a legenda das fotos candidatas (do técnico ou gerada), a origem da evidência e uma conclusão nova: **"Evidência existe, falta legenda"**, que fecha o item como falso positivo e alimenta a medição de precisão da IA.

## Detalhes técnicos

- `auvo.ts`: normalizador de anexos passa a devolver `{ url, name, subtitle, description, kind }` (kind derivado de `extension` e `attachmentType`); `filterPhotos` usa `kind`/extensão.
- Migração: `auvo_task_reports.photo_captions jsonb` (legenda por URL, com `source: 'auvo' | 'vision'`), `photo_caption_status text`, `photo_audit_stage text`; `auvo_photo_findings.candidate_photos jsonb` e `evidence_source text`. GRANT/RLS espelhando as tabelas atuais.
- Backfill de legendas por SQL a partir de `auvo_tasks.raw_payload->'attachments'` (match por URL), sem IA.
- `photoAudit.ts`: `auditReportPhotos` recebe legendas e devolve `candidate_photos`; nova `captionMissingPhotos()` multimodal (blocos `image_url`), chamada só na Etapa 2.
- `photoBackfill.ts`: pipeline em dois passes (`stage='captions'` → `stage='vision'`), preservando `keptMap` de revisões humanas; falha de visão marca `photo_caption_status='error'` sem travar o lote.
- `useAuvoIntegration.ts` e `AuvoGroupReviewDialog.tsx`: expor legenda/origem, miniaturas candidatas e a nova conclusão.
- Reset controlado: `auvo_task_reports` com `photo_audit_status='gaps'` volta para `pending`, restrito à empresa.
