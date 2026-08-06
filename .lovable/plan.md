# Exibir legendas das fotos no relatório do Auvo

Hoje a galeria "Fotos do atendimento" mostra apenas as miniaturas e o lightbox mostra somente a imagem. As legendas já existem nos dados (escritas pelo técnico no Auvo em `subtitle`/`description`, e as geradas por visão ficam em `photo_captions`), mas não são apresentadas.

## O que muda

- Cada miniatura passa a exibir a legenda abaixo da foto (2 linhas, truncada), com `title` para ver o texto completo no hover.
- No lightbox, a legenda aparece em uma faixa sob a imagem, junto ao contador "x de y".
- Quando a legenda vier da análise visual da IA (e não do técnico), ela recebe um selo discreto "legenda gerada por IA", para não confundir evidência declarada com inferida.
- Fotos sem legenda alguma mostram "Sem legenda" em texto suave — isso é justamente o sinal relevante para a auditoria.

Nenhuma regra de auditoria, cálculo ou sincronização é alterada: é apresentação.

## Detalhes técnicos

- `src/hooks/useAuvoTaskReport.ts`: incluir `photo_captions` no `select` de `auvo_task_reports`; estender `AuvoReportAttachment` com `subtitle`/`description`; montar por anexo o campo resolvido `caption` + `caption_source` ("auvo" | "vision"), priorizando a legenda do Auvo sobre a gerada por visão.
- `src/components/admin/auvo/AuvoTaskReportView.tsx`: renderizar a legenda na grade de miniaturas e no `DialogContent` do lightbox, usando tokens semânticos existentes (`text-muted-foreground`, `Badge variant="secondary"`).
