# Plano — eliminar as execuções presas da Marina

## Diagnóstico confirmado

- As duas tentativas mais recentes, às **18:59:54** e **19:00:24 de 27/08**, chegaram ao backend e falharam novamente com **429 `engine_busy`** no motor externo.
- O Arrow chama hoje o endpoint `/chat/completions` do Hermes. Essa chamada não fornece ao Arrow um identificador de execução para interrompê-la explicitamente na VPS.
- O controle criado no Arrow usa contadores em memória (`inflightTotal`). Em uma função serverless, cada instância possui seu próprio contador; portanto ele não é um limite global e não enxerga as execuções que já ficaram ativas na VPS.
- No cliente, trocar de conversa não aborta necessariamente a solicitação anterior: o `AbortController` só é encerrado ao desmontar o hook. Além disso, a conversa comum e o palco de Design mantêm instâncias separadas do stream.
- A versão atual do Hermes oferece o fluxo de execuções com `run_id` e interrupção explícita (`POST /v1/runs/{run_id}/stop`), que é mais confiável do que depender apenas do fechamento da conexão HTTP.

## Correção proposta

### 1. Recuperar a VPS antes de novos testes

- Consultar as execuções ativas no Hermes e identificar idade, sessão e origem.
- Encerrar as execuções órfãs; se a versão instalada não expuser essa administração, reiniciar somente o serviço do gateway Hermes.
- Confirmar que o contador de execuções volta a zero e executar uma chamada simples diretamente na VPS.
- Registrar a versão do Hermes e conferir se ela já contém a API `/v1/runs` com operação `stop`.

### 2. Tornar o cancelamento explícito de ponta a ponta

- Migrar as conversas da Marina de `/chat/completions` para `/v1/runs` quando suportado.
- Capturar o `run_id`, consumir os eventos SSE e chamar `/v1/runs/{run_id}/stop` ao clicar em **Parar**, trocar de conversa, sair da aba Design ou fechar a tela.
- Manter fallback compatível para instalações antigas, mas cancelar e drenar corretamente o stream nesse caminho.
- Tratar cancelamento como estado normal, preservando o texto parcial e sem gerar resposta genérica de erro.

### 3. Corrigir o ciclo de vida no frontend

- Abortar o pedido anterior sempre que `threadId` mudar, e não apenas quando o componente desmontar.
- Garantir que apenas o stream da aba ativa possa permanecer em execução.
- Bloquear envio duplicado e tornar **Tentar de novo** uma nova execução única, nunca uma repetição paralela.
- Manter o botão **Parar** disponível desde o primeiro instante de “pensando”, inclusive antes do primeiro token.

### 4. Mover o limite real para o lugar correto

- Usar o limite global do próprio Hermes/VPS como fonte de verdade; o contador local do Arrow ficará apenas como proteção por instância e telemetria.
- Configurar capacidade reservada para interações humanas e um teto menor para tarefas de fundo.
- Adicionar expiração/reaper para execuções sem heartbeat, evitando que uma queda de rede ocupe vaga indefinidamente.
- Suspender tarefas automáticas da Marina enquanto não houver capacidade, sem competir com chat e Design.

### 5. Diagnóstico operacional

- Registrar `run_id`, origem (chat, Design, WhatsApp ou fundo), início, fim, cancelamento, duração e status — sem conteúdo sensível.
- Exibir na aba **Execuções** quantidade ativa, limite, execuções antigas e ação administrativa para interromper uma execução presa.
- Diferenciar claramente `motor_ocupado`, `execução_cancelada`, `falha_de_rede` e `motor_indisponível`.

## Validação

1. Confirmar zero execuções ativas após a limpeza inicial.
2. Enviar uma pergunta simples e uma criação no Canva; ambas devem iniciar e concluir.
3. Parar durante “pensando”, durante texto e durante uma ferramenta; a vaga deve ser liberada em até 1 segundo.
4. Trocar de conversa e de aba durante uma execução; não pode restar run ativa na VPS.
5. Executar vários pedidos controlados e verificar que o teto global é respeitado sem 429 para interação humana.
6. Confirmar que chat web, Design e WhatsApp usam o mesmo controle e que tarefas de fundo não esgotam as vagas.

## Dependência operacional

A correção definitiva exige uma ação inicial na VPS para limpar as execuções que já estão presas e confirmar/atualizar a versão do Hermes. As alterações no Arrow evitam que o problema volte, mas não conseguem apagar retroativamente essas runs sem acesso ao serviço externo.
