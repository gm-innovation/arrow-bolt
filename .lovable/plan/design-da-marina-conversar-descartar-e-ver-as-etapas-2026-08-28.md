# Design da Marina: conversar, descartar e ver as etapas

## 1. Conversar sem virar pedido de imagem

Hoje toda mensagem enviada na aba Design é marcada como pedido de peça, então qualquer pergunta dispara o fluxo inteiro de criação.

- A conversa passa a ser conversa: perguntas, dúvidas e comentários sobre a peça no palco são respondidos normalmente, sem gerar arte.
- A criação só acontece quando há intenção explícita: pelas ações rápidas, pelo botão "Gerar peça" ao lado do campo de mensagem, ou quando a frase pede claramente uma peça nova ("crie um post…", "faça um card…").
- Pedidos de ajuste continuam ajustando o arquivo que já existe, sem criar peça nova.
- Nas conversas comuns, a Marina recebe o contexto da peça em foco (briefing, textos, estado do Canva) para poder responder sobre o trabalho.

## 2. Descartar versões

- Cada versão na fita de versões ganha ação de descartar, com confirmação.
- Versão descartada sai do palco e da fita; se era a ativa, o palco passa para a versão mais recente que sobrou.
- Um filtro "ver descartadas" permite recuperar (voltar para pendente) uma peça descartada por engano.
- Descartar em massa: quando há várias versões, ação "descartar todas menos esta".

## 3. Etapas visíveis com evolução

O palco passa a mostrar uma lista de etapas em vez de um único texto de status:

```text
✓ briefing da direção de arte           12s
✓ fotografia-base gerada                48s
✓ revisão da direção de arte            21s
◐ montando as camadas no Canva…      1min 40s
· exportando o preview do Canva
```

- Etapa concluída mostra o tempo que levou; a atual mostra spinner e cronômetro; as futuras ficam apagadas.
- Etapa que falhou fica marcada com o motivo e, quando for o Canva, com o botão de tentar novamente.
- A lista sobrevive ao fim do stream: fica gravada na peça, então dá para ver depois onde o tempo foi.

## 4. Por que está demorando

A lista de etapas com tempo já é a medição: a partir dela fica visível qual chamada consome os minutos. Junto com ela:

- Registro do tempo de cada etapa no log da função, para comparar execuções.
- Teto de tempo por etapa. Estourando: a etapa é marcada como demorada, a peça fica com a prévia no palco e "Canva pendente" com retentativa, em vez de espera indefinida.
- Suspeitas principais a confirmar com uma execução medida: a chamada única ao Canva (criar camadas + exportar na mesma execução, hoje sem teto de tempo e sujeita à fila do motor) e a revisão de arte com refação.
- Se a medição confirmar o Canva como gargalo, a criação das camadas passa a rodar em segundo plano: a conversa é liberada na hora e a peça é atualizada quando o Canva responder.

## Detalhes técnicos

- `src/components/marina/design/DesignWorkspace.tsx`: `ask` deixa de forçar `design: true`; passa `design: true` só nas ações rápidas e no botão explícito; envia `focus_design_id` da peça ativa para dar contexto; wiring das novas ações de descarte.
- `src/components/marina/design/DesignQuickActions.tsx` / `MarinaComposer` (uso local): botão "Gerar peça" para marcar intenção explícita.
- `supabase/functions/marina-chat/index.ts`: `designMode` passa a exigir `body.design === true` ou intenção forte; conversa em modo design recebe contexto da peça focada; emitir eventos `step` (`{id, label, state, ms}`) em cada etapa e persistir a trilha em `marina_design_approvals.steps`; envolver cada etapa em teto de tempo próprio, gravando `fail_reason`.
- `supabase/functions/marina-chat/router.ts`: `isDesignRequest` mais estrito (ignora pergunta/ajuste/comentário).
- `supabase/functions/marina-chat/design.ts`: teto de tempo na chamada do Canva e retorno de motivo quando estourar.
- `src/components/marina/design/DesignStage.tsx`: componente de trilha de etapas; descarte por versão, recuperar descartada, "descartar todas menos esta".
- `src/hooks/useMarinaDesigns.ts`: incluir `steps` no tipo, ação de restaurar status e listagem opcional de descartadas.
- Migration: coluna `steps jsonb` em `marina_design_approvals`.

## Validação

- Perguntar "o que você usou de referência nessa peça?" na aba Design e confirmar que nenhuma arte nova é criada.
- Pedir "crie um post de lançamento" e ver a trilha de etapas avançando com tempos.
- Descartar uma versão e confirmar que sai do palco e pode ser recuperada.
- Ler os tempos por etapa de uma execução real e apontar a etapa responsável pela demora.
