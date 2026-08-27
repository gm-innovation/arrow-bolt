# Marina no Design: "estou com muitas tarefas em andamento"

## O que está acontecendo (confirmado no log)

O motor externo (Hermes na VPS) recusou o pedido com:

```text
429 Too many concurrent runs (max 10)
```

Não é erro do Canva nem do palco de Design. O motor tem limite de 10 execuções
simultâneas e esse limite estava esgotado no momento do pedido. Hoje o Arrow
apenas traduz o 429 em um aviso e desiste na primeira tentativa — por isso a
Marina respondeu "me chame de novo em um minuto".

Provável origem do esgotamento: execuções abertas e não encerradas (usuário
fecha a aba, stream interrompido, pedidos de design que são mais longos), mais
WhatsApp e chat web disputando as mesmas 10 vagas.

## O que fazer

### 1. Não desistir no primeiro 429
Repetir a chamada ao motor com espera curta e crescente (3 tentativas,
respeitando `Retry-After` quando vier), avisando na conversa "aguardando uma
vaga no motor…" em vez de encerrar a resposta. Só depois de esgotar as
tentativas mostrar o aviso atual.

### 2. Liberar vagas que ficam presas
- Encerrar a chamada ao motor quando o usuário fecha a conversa ou cancela
  (propagar o cancelamento do stream para o `fetch` do motor).
- Teto de tempo por chamada, para nenhuma execução ficar pendurada
  indefinidamente.

### 3. Reservar vaga para o chat da pessoa
Um contador leve de execuções em andamento por canal: quando o motor estiver
saturado, as rotinas de fundo (WhatsApp em lote, aprendizado de habilidades,
sincronizações) cedem a vez e esperam; o pedido feito por uma pessoa na tela
tem prioridade.

### 4. Mensagem honesta no palco de Design
Quando o motor estiver lotado, o palco mostra o estado ("motor ocupado,
tentando novamente") com botão "tentar de novo" que reenvia o mesmo pedido,
em vez de deixar a conversa com uma resposta morta.

## Detalhes técnicos

- `supabase/functions/marina-chat/hermes.ts`: `engineChat` passa a tratar 429
  com retentativa (backoff com jitter, respeitando `Retry-After`), aceitar
  `AbortSignal` do stream e aplicar timeout próprio.
- `supabase/functions/marina-chat/index.ts`: emitir `status` durante a espera;
  abortar a chamada ao motor no `cancel` do `ReadableStream`; manter o aviso
  atual apenas como último recurso; registrar o motivo (`rate_limit`) em
  `ai_agent_runs`.
- Chamadas de fundo (`marina-skill-learner`, fluxos de WhatsApp) passam a marcar
  a origem e a recuar diante de 429, sem retentativa agressiva.
- `src/components/marina/design/DesignStage.tsx`: estado de "motor ocupado" com
  ação de reenviar.

## Fora do escopo

Ajustes no próprio Hermes na VPS (aumentar o limite de execuções simultâneas ou
limpar execuções travadas) precisam ser feitos no servidor — o Arrow só pode
lidar bem com o limite, não elevá-lo.
