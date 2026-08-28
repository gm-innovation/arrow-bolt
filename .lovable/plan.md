# Preview real da peça + arte decente (Marina Design)

Dois problemas resolvidos juntos:

1. O palco mostra o iframe do Canva, que responde "Esse design é privado" (403) — nunca dá para ver a peça.
2. A peça que o Canva montou saiu com template genérico (fonte pixelada, blocos verdes, "123 Anywhere Street") — nada a ver com a LECSOR.

## Decisão

Fluxo "os dois": a Marina **sempre gera a arte** (imagem ultrarrealista, com as fotos de referência) e essa imagem é o que aparece no palco imediatamente. Em paralelo, o Canva recebe essa mesma arte como base editável, para quem quiser refinar depois.

## Como fica

- Pedido de design → a Marina gera a imagem final pelo gerador de imagens do Arrow, guarda no Arrow e o palco mostra **a imagem**, não o iframe.
- Se houver design no Canva, ele vira link secundário ("Abrir no Canva") e, quando possível, um PNG exportado; o iframe deixa de ser a fonte do preview.
- Aprovar exporta/guarda o arquivo como hoje.
- Sem foto de referência, a Marina avisa que é composição (regra que já existe).

## Direção de arte (o que impede o resultado feio)

Regras fixas no prompt de geração e no prompt do Canva:

- Fotografia ultrarrealista como base; proibido pixel art, retro, cartoon, vetor, ilustração, 3D estilizado.
- Tipografia limpa e legível (sem fonte pixelada/monoespaçada decorativa); hierarquia título > subtítulo > CTA.
- Paleta LECSOR (azul-escuro naval + acento da marca), sem verde-neon nem confete gráfico.
- Proibido texto de placeholder ("Anywhere Street", "RSVP", "Lorem"); só usar dados que a pessoa passou.
- Espaço para logo, site e WhatsApp no rodapé, discreto.
- Formato respeitado (1080x1080, 1080x1350, story, banner).

## Detalhes técnicos

- `supabase/functions/marina-chat/design.ts`
  - `ART_DIRECTION` novo bloco (tipografia, paleta, proibições, placeholders) usado tanto em `generateMarinaImage` quanto em `DESIGN_PROMPT`.
  - `generateMarinaImage` passa a receber `format` para pedir a proporção certa.
  - nova `exportCanvaPreview(canvaUrl)`: pede export PNG ao motor e devolve URL, usada só como reforço.
- `supabase/functions/marina-chat/index.ts` (fluxo design)
  - gerar a imagem da Marina **sempre**, não só no fallback; gravar `storage_path` e `source = 'marina'`;
  - quando o motor devolver `DESIGNCANVA`, gravar também `canva_url` no mesmo registro (peça única, dois caminhos);
  - o texto pedido ao Canva passa a incluir a direção de arte.
- `src/components/marina/design/DesignStage.tsx`
  - prioridade de preview: `file_url` (imagem) > PNG exportado > iframe;
  - iframe só como último recurso, com aviso de design privado e botão "Abrir no Canva";
  - selo passa a indicar "arte da Marina" + "editável no Canva" quando os dois existirem.
- `src/hooks/useMarinaDesigns.ts` — sem mudança de contrato (usa `file_url`/`canva_url` já existentes).

Sem mudança de schema.
