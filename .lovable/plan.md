# Canva da Marina: um único `generate_design` com o texto no pedido

A montagem trava porque o fluxo atual quebra o Canva em fases de edição (`createCanvaFoundation` → `composeCanvaLayers` → `validateCanvaLayers`), e a edição do MCP só altera texto que já existe — nunca insere texto novo. Resultado: a fase de camadas nunca retorna e a execução morre sem link.

A correção é abandonar a montagem por edição na criação: o pedido inteiro (título, subtítulo, CTA, logotipo, formato, fundo, estilo) vai em UM prompt, direto para `generate_design`, que devolve o design já com texto em cerca de 50 segundos.

## Como fica o fluxo

```text
Formulário / mensagem  ->  prompt único completo  ->  generate_design (~50s)
                                                        |
                                              DESIGNCANVA: <url>  ->  preview + aprovação
```

1. **Criação (caminho único).** Uma só chamada ao motor com o briefing completo e a instrução de responder as linhas `DESIGNCANVA: <url>` (e, quando houver, `DESIGNEXPORT: <url>` do PNG). Sem fases de fundação, composição ou validação de camadas.
2. **Etapas exibidas.** A trilha passa a ter: briefing, geração no Canva, exportação, preview guardado. As etapas `canva_arquivo`, `canva_camadas` e `canva_validacao` saem de cena (registros antigos com essas etapas continuam legíveis, marcados como encerrados).
3. **Ajuste.** Continua existindo, mas só para alterar texto que já está na peça (ex.: trocar "30% OFF" por "50% OFF") ou trocar imagem/cor. Se o pedido de ajuste for para *adicionar* um texto que não existe, a Marina gera uma nova versão com `generate_design` em vez de tentar editar.
4. **Conversa.** Mantida como está: mensagem comum conversa; só o botão "Gerar peça" / ações rápidas disparam design.
5. **Preview e aprovação.** Card com prévia, "Abrir no Canva", Aprovar / Ajustar / Descartar — sem mudança de comportamento, mas a aprovação agora encontra `canva_url` desde a primeira resposta.
6. **Tempo e carregamento.** Timeout da geração em 300 s, com indicador de progresso e tempo decorrido; nada de espera silenciosa de minutos. Falha devolve motivo amigável e botão de nova tentativa.

## Formulário das ações rápidas

O formulário "Criar post" já coleta especificações, formato, tom, CTA, paleta, estilo e marca. Ele passa a montar exatamente o prompt no formato acordado:

```text
Use generate_design do Canva com este briefing completo:
Tamanho: ...
Fundo: ...
Título: ...
Subtítulo: ...
CTA: ...
Logotipo: LECSOR TECHNOLOGY
Estilo: ...
Retorne os links no formato DESIGNCANVA: <url>
```

Campos vazios são omitidos. A prévia do prompt na interface mostra o texto final, então o usuário confere antes de enviar.

## Detalhes técnicos

- `supabase/functions/marina-chat/design.ts`: nova `generateCanvaDesign` (uma chamada, prompt completo, orçamento de tokens amplo, prioridade `fundo`, timeout de 300 s) lendo `DESIGNCANVA`/`DESIGNEXPORT`. `composeCanvaLayers`/`validateCanvaLayers` deixam de ser usadas na criação; o prompt do sistema perde a exigência de camadas separadas e de transações de edição, e ganha a regra "todo o texto vai no pedido de geração".
- `supabase/functions/marina-chat/index.ts`: `DESIGN_STEP_DEFINITIONS` reduzido; `processCanvaRetry` vira uma sequência curta (gerar → exportar se preciso → guardar); persiste `canva_url` na primeira resposta; heartbeat e reconciliação mantidos, com janela de 6 minutos; `design_adjust_canva` roteia entre editar texto existente e regerar.
- `src/lib/marina/designTemplates.ts`: montagem do prompt no formato acima, incluindo a linha de retorno `DESIGNCANVA`.
- `src/hooks/useMarinaDesigns.ts`, `src/components/marina/design/DesignStage.tsx`, `DesignWorkspace.tsx`: rótulos das novas etapas, indicador de tempo, mensagens de falha e retentativa.
- Aprovação continua exigindo `canva_url` + arquivo exportado guardado no bucket privado; deixa de exigir a validação de camadas nativas.

## Validação

Gerar uma peça real pela aba Design e confirmar, no registro persistido: `canva_url` preenchido na primeira resposta, exportação guardada, etapas concluídas e tempo total próximo de um minuto. Depois testar um ajuste de texto existente e um pedido de texto novo (que deve gerar nova versão).

## Fora do escopo

Publicação automática em redes sociais, OAuth do Canva e reprocessamento das versões antigas travadas além de marcá-las como encerradas.
