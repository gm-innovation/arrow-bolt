# Design da Marina: acabar com a espera

## Problema

Hoje um pedido de peça roda em fila, uma etapa depois da outra, tudo antes de aparecer qualquer coisa no palco:

```text
briefing (modelo pesado)
  → fotografia-base
  → revisão da direção de arte
  → refação
  → revisão de novo
  → refação
  → guardar
  → montar camadas no Canva (motor externo)
  → exportar preview no Canva (motor externo)
  → guardar preview
```

São até nove chamadas de IA em série, várias no motor externo, que é a parte mais lenta e a que sofre com fila. Enquanto isso o palco mostra só "Preparando a peça…" e um giro infinito, sem nada visível e sem noção de tempo.

## O que muda

1. **Aparecer algo cedo.** Assim que a fotografia-base existir, ela vai para o palco como prévia, com aviso claro de que a versão editável ainda está sendo montada no Canva. A aprovação continua bloqueada até o arquivo Canva e o preview exportado existirem — a regra do layout editável não muda.

2. **Menos idas e voltas.** A revisão da direção de arte passa a ter uma única refação (em vez de duas), e só é feita quando a crítica volta rápido; passado o tempo de corte, a peça segue com a base que já existe.

3. **Uma chamada só no Canva.** Montar as camadas e devolver o preview exportado passam a ser um único pedido ao motor: ele responde com o link do design e o link da exportação juntos. A chamada separada de exportação só é usada como reserva.

4. **Modelos mais rápidos onde não custa qualidade.** Briefing e crítica saem do modelo pesado para um modelo rápido; a geração da fotografia continua no modelo de imagem.

5. **Trabalho em paralelo.** Busca dos assets padrão da biblioteca e preparação do briefing deixam de esperar uma à outra.

6. **Tempo visível.** O palco mostra a etapa atual em texto ("montando as camadas no Canva…"), o tempo decorrido e um aviso quando passar do esperado, com opção de continuar em segundo plano — a conversa segue liberada.

7. **Teto de tempo por etapa.** Cada etapa tem prazo próprio. Estourando o prazo, a peça fica como "Canva pendente" com a prévia já visível e o botão de tentar novamente, em vez de girar sem fim.

## Detalhes técnicos

- `supabase/functions/marina-chat/index.ts`: emitir `design` com `file_url` da base logo após `storeMarinaImage`; reduzir o laço de revisão a uma iteração com corte por tempo; rodar `defaultAssetReferences` e `buildBrief` em paralelo; envolver cada etapa em prazo próprio (`AbortSignal.timeout`), gravando `fail_reason` em vez de travar.
- `supabase/functions/marina-chat/design.ts`: `createEditableCanvaDesign` passa a pedir também a linha de exportação (`DESIGNEXPORT: <url>`) e devolvê-la; `exportDesign` fica como reserva quando a linha não vier.
- `supabase/functions/marina-chat/artDirector.ts`: `buildBrief`/`reviewArt` em modelo rápido; limite de refação em 1.
- `src/components/marina/design/DesignStage.tsx`: prévia base com selo "prévia — versão editável em preparo", etapa atual, cronômetro e aviso de demora; botão de aprovar segue desabilitado sem Canva + preview.

## Validação

- Pedir uma peça e confirmar que a prévia aparece no palco em poucos segundos, com etapa e cronômetro.
- Confirmar que o botão "Aprovar peça" só libera quando o Canva e o preview exportado existem.
- Simular demora/falha no Canva e confirmar "Canva pendente" com prévia e retentativa, sem giro infinito.
- Conferir no Canva que fotografia, logo, textos e formas continuam em camadas separadas.
