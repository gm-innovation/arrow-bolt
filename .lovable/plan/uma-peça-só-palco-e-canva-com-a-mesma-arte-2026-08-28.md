# Uma peça só: palco e Canva com a mesma arte

## O problema

Hoje o fluxo de design roda em paralelo: o motor externo cria um design no Canva (escolhendo fundo, fotos e texto por conta dele) e, ao mesmo tempo, a Marina gera a arte no Arrow. Resultado: duas peças diferentes — a do palco (aprovada visualmente) e a do Canva (que é a editável). Quem aprova no Arrow não recebe o mesmo arquivo que abre no Canva.

## A decisão

A arte da Marina passa a ser a **única** peça. O Canva deixa de inventar uma peça e passa a receber essa arte como imagem base do design editável.

## Como fica o fluxo

```text
pedido → briefing do diretor de arte
       → Marina gera a arte (com as referências)
       → revisão/refação única
       → arte guardada no Arrow  ← palco mostra esta imagem
       → Canva: cria design com ESSA imagem como base + textos do briefing
       → aprovação humana no Arrow
```

1. Nada é pedido ao Canva antes de a arte existir.
2. Com a arte pronta, a Marina envia ao motor uma instrução única: criar o design no Canva usando a imagem enviada (URL assinada) como fundo/asset principal, sem trocar a foto, sem template decorativo e com os textos exatos do briefing.
3. O registro de aprovação continua um só: `file_url` (arte, fonte da verdade do palco) e `canva_url` (mesma peça, versão editável).
4. Se o Canva falhar, a peça continua válida: o palco mostra a arte e o aviso passa a ser "versão editável no Canva indisponível" — não "não consegui fazer a peça".
5. Ajuste pedido no palco regenera a arte e **atualiza a mesma peça** no Canva (ou recria a partir da nova arte), nunca gera uma peça paralela.

## Na tela

- Palco: a arte, como hoje.
- Selos: "arte da Marina" continua; "editável no Canva" só aparece quando o design do Canva foi criado a partir dessa mesma arte.
- Sem iframe do Canva como preview (ele volta 403 em design privado); Canva só como link "Abrir no Canva".

## Detalhes técnicos

- `supabase/functions/marina-chat/index.ts`: inverter a ordem do modo design — briefing → `generateMarinaImage` → revisão → upload no bucket `marina-designs` → só então chamada ao motor com a URL assinada da arte. O prazo de 75 s passa a valer só para a etapa Canva; estourar o prazo não invalida a peça.
- `supabase/functions/marina-chat/design.ts`: `DESIGN_PROMPT` ganha regra explícita — "a imagem enviada é a peça final; use-a como base do design no Canva; não gere nem escolha outra imagem; apenas reproduza os textos do briefing sobre ela". Mantém o sinal `DESIGNCANVA:` para devolver a URL.
- `friendlyFailReason`: nova mensagem para falha só do Canva (peça existe, versão editável não).
- `src/components/marina/design/DesignStage.tsx`: preview sempre `file_url`; remover o caminho de iframe; aviso de falha diferenciado.
- Sem mudança de schema: `marina_design_approvals` já tem `file_url`, `canva_url`, `source` e `fail_reason`.
