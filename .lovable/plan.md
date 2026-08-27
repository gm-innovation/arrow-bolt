# Marina: "estou com muitas tarefas em andamento" com um único usuário

## O que está acontecendo

O motor na VPS recusa novas execuções com "máximo de 10 execuções simultâneas". Como só você está testando, isso não é volume real de uso: são execuções **abandonadas que continuam abertas** na VPS.

Confirmado no código:

- Quando você fecha a aba, troca de conversa ou clica em parar, o app cancela a conexão do navegador (`src/hooks/useMarina.ts` aborta o controller), mas a função de servidor **não repassa esse cancelamento ao motor** — a chamada em `supabase/functions/marina-chat/hermes.ts` é feita sem `signal`. O motor segue processando aquela execução até o fim, ocupando uma vaga.
- Cada mensagem pode gerar **mais de uma execução** no motor: a resposta principal, a checagem de saúde da conexão, o resumo/aprendizado de habilidades e o aprendiz automático. Em testes seguidos de design (respostas longas), 3–4 tentativas já enchem as 10 vagas.
- Não existe limite de concorrência nem fila do nosso lado, então retentativas e cliques repetidos empurram tudo de uma vez.
- Quando dá 429, respondemos com o aviso e desistimos, sem esperar vaga — o que faz você tentar de novo e piorar o acúmulo.

Isso é um vazamento de vagas, não sobrecarga.

## O que vamos fazer

1. **Cancelar de verdade na VPS**
   Repassar o cancelamento do navegador até a chamada ao motor. Se você fecha a aba ou clica em parar, a vaga é liberada na hora.

2. **Uma execução por mensagem**
   - Checagem de saúde da conexão deixa de abrir execução de conversa (usar chamada leve, com cache de alguns minutos).
   - Resumo de conversa, aprendizado de habilidades e classificação passam a rodar depois, em fila de baixa prioridade, e nunca junto da resposta que você está esperando.

3. **Fila com prioridade e teto de concorrência**
   Um controle nosso, com teto abaixo do limite do motor (ex.: 6 vagas), reservando espaço para o chat humano (web e WhatsApp). Tarefas de fundo (sincronização, aprendiz) esperam.

4. **Esperar vaga em vez de desistir**
   No 429, aguardar em ciclos curtos com aviso honesto ("aguardando vaga no motor…") e só então responder. Se realmente não houver vaga, aviso claro e botão "tentar de novo" no palco de Design.

5. **Faxina e diagnóstico**
   Registrar cada execução (início, fim, cancelamento) para enxergar quantas ficam penduradas, e, na VPS, encerrar as execuções órfãs de hoje para você voltar a testar imediatamente.

## Detalhes técnicos

- `supabase/functions/marina-chat/hermes.ts`: `engineChat`/`engineText` recebem e propagam `AbortSignal`; o handler passa `req.signal` e trata o abort como cancelamento (sem gravar resposta vazia).
- `supabase/functions/marina-chat/index.ts`: mover `refreshConversationState`, aprendiz e resumo para pós-resposta; a checagem de conexão (linha ~574) usa endpoint de saúde/cache em vez de `chat/completions`.
- Novo controle de concorrência compartilhado (tabela leve + guarda em código) com classes `interativo` e `fundo`, teto configurável por segredo.
- Retentativa no 429 com backoff limitado e evento de status para a interface.
- `src/hooks/useMarina.ts` e o palco de Design passam a exibir o estado "aguardando vaga" e a ação de repetir.
- Para a limpeza das execuções órfãs na VPS eu preciso do seu ok, já que a ação é feita no servidor do motor.
