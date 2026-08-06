# Refinar a auditoria de evidência fotográfica (Auvo)

## Problema confirmado

Hoje a IA que aponta "Sem foto" **nunca olha as fotos**. Em `photoAudit.ts` o inventário enviado ao modelo é apenas a lista de nomes de arquivo do anexo do Auvo (`1. 6f3a...jpg`), e o próprio prompt manda apontar tudo quando o nome não sugere a atividade. Resultado: atendimentos com 13 fotos legítimas (multímetro, vedações novas, contêiner aberto, painel do Operator Unit) aparecem como 13 lacunas — o que falta é **legenda**, não evidência.

## O que muda

A auditoria passa a ser visual, em duas etapas:

1. **Legendagem automática das fotos.** Cada foto do atendimento é descrita por um modelo de visão (o que aparece, equipamento, etapa provável: desmontagem, medição, peça nova, limpeza, remontagem, leitura de instrumento). As legendas são gravadas uma única vez por relatório, para não pagar visão de novo em cada reprocessamento.
2. **Confronto relatório × legendas.** O modelo recebe as legendas reais (não os nomes de arquivo) e só aponta lacuna quando **nenhuma** foto é plausivelmente compatível com a atividade. Fotos genéricas contam como evidência parcial.

Além disso, a régua fica mais conservadora:

- Atividades correlatas passam a ser agrupadas (ex.: "medição ôhmica Gyro #1" e "Gyro #2" com a mesma foto de multímetro deixam de virar duas lacunas quando há leitura fotografada).
- Cada apontamento guarda as fotos candidatas mais próximas, para o revisor julgar em segundos.
- Máximo de apontamentos por atendimento cai, priorizando intervenção física sem qualquer registro.

## Revisão humana

No modal de revisão, cada lacuna passa a exibir:

- miniaturas das fotos candidatas com a legenda gerada (clique abre o visualizador já existente);
- uma conclusão nova: **"Evidência existe, falta legenda"** — trata o caso do print enviado, tira o item da fila de pendências e o registra como falso positivo, alimentando a medição de precisão da IA;
- o motivo em uma frase do porquê a IA não encontrou a foto.

## Reprocessamento

Os relatórios já auditados pelo motor antigo (status `gaps`) voltam para a fila e são reprocessados pelo novo motor em lotes, com a barra de progresso que já existe em Auditoria Auvo. Decisões humanas já registradas são preservadas.

## Detalhes técnicos

- `supabase/functions/auvo-sync/photoAudit.ts`: nova função `captionPhotos()` usando chamada multimodal (`image_url`) ao AI Gateway, em lotes de até ~8 imagens por requisição e limite de 20 fotos por relatório; `auditReportPhotos()` passa a receber `PhotoInventoryItem & { caption }` e devolve também `candidate_photos` e `match_reason`.
- Migração: `auvo_task_reports.photo_captions jsonb`, `photo_caption_status text`, e `auvo_photo_findings.candidate_photos jsonb`; `review_status` ganha o valor lógico `dismissed` reaproveitado para "falta legenda" com `review_notes` padronizado (sem novo enum). GRANT/RLS seguem os das tabelas existentes.
- `photoBackfill.ts`: gera legendas antes do confronto, reaproveita `photo_captions` quando já existirem, mantém `keptMap` de revisões humanas; erro de visão marca `photo_caption_status = 'error'` sem travar o lote.
- `src/hooks/useAuvoIntegration.ts`: seleciona os novos campos e expõe contador de falsos positivos.
- `src/components/admin/auvo/AuvoGroupReviewDialog.tsx`: strip de miniaturas + legenda por lacuna e nova opção de conclusão.
- Reset controlado via update em `auvo_task_reports` (status `gaps` → `pending`) restrito à empresa.
