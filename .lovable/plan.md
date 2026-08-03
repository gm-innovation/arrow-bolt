# Marina Live — modo de conversa contínua por voz

## O que é possível hoje, com honestidade
O GPT Live usa um modelo de áudio nativo (entra som, sai som) sobre WebRTC, com latência de 100–300ms e leitura de entonação. A IA disponível no Arrow hoje trabalha encadeada: transcrição → modelo de texto → síntese de voz. Dá para chegar muito perto da *experiência* (conversa contínua, sem clicar no microfone, com interrupção no meio da fala da Marina), mas não da latência nem da percepção de entonação. Latência realista por turno: 1,5s a 3s.

O plano entrega essa experiência agora e isola a camada de áudio para que trocar por um modelo realtime full-duplex no futuro seja substituir uma peça, não reescrever a Marina.

## Experiência final
- Botão "Modo conversa" no chat da Marina. Ao ativar, o microfone fica aberto e a conversa flui sem cliques.
- A fala é detectada automaticamente: quando você para de falar, ela responde; quando você volta a falar durante a resposta, ela cala na hora e passa a ouvir.
- Indicadores claros de estado: ouvindo, entendendo, pensando, falando.
- Barra de nível de voz ao vivo e transcrição parcial aparecendo enquanto você fala.
- Sair do modo conversa devolve o chat de texto normal, com todo o histórico preservado.
- No aplicativo Android, mantém o comportamento nativo já usado nos outros recursos; onde o navegador não permitir microfone contínuo, degrada para o botão de gravar atual.

## Ondas de implementação

### Onda 1 — Núcleo da conversa contínua
- Camada de captura de áudio contínua com detecção de fala e de silêncio no próprio navegador, calibrada para ruído de escritório e de campo.
- Envio de trechos completos e válidos para transcrição, com transcrição parcial exibida na tela.
- Encerramento de turno por silêncio, com janela de tolerância para hesitação (pausa curta não encerra a fala).
- Interrupção: falar durante a resposta corta a voz da Marina imediatamente e descarta o áudio pendente.
- Máquina de estados única para o modo conversa, evitando sobreposição de gravação e reprodução.

### Onda 2 — Resposta mais rápida percebida
- Síntese de voz iniciada pelas primeiras frases da resposta, sem esperar o texto inteiro.
- Fila de reprodução por frase, encadeada e cancelável na interrupção.
- Reaproveitamento da sessão de microfone entre turnos, sem pedir permissão de novo.

### Onda 3 — Poder de agente na voz
- A Marina mantém todas as ferramentas atuais durante a sessão de voz, inclusive escrita, chamados e roadmap.
- Toda criação, edição ou exclusão exige confirmação falada explícita, com a Marina repetindo em uma frase o que vai fazer antes de executar.
- Frases de espera enquanto uma consulta demora, para a conversa não ficar muda.
- Correção de reconhecimento: nomes próprios, códigos de OS e siglas do Arrow são normalizados antes de chegar às ferramentas.

### Onda 4 — Memória da sessão
- Resumo automático em segundo plano quando a conversa cresce: os pontos-chave da sessão são compactados e reinjetados, e as mensagens antigas saem do envio.
- Fatos relevantes da sessão ficam recuperáveis por busca semântica, aproveitando a base de conhecimento já existente.
- O usuário não percebe o corte: referências a algo dito no início da conversa continuam funcionando.

### Onda 5 — Preparação para o full-duplex real
- A camada de áudio fica atrás de uma interface única, com a implementação encadeada como primeira opção.
- Deixar documentado e isolado o ponto exato onde entraria um transporte de baixa latência com modelo de áudio nativo, incluindo emissão de credencial efêmera pelo backend.
- Nenhuma chave de terceiros é adicionada agora; a troca fica pendente da sua decisão sobre conta própria.

### Onda 6 — Observabilidade
- Registro por turno: início da fala, fim da fala, tempo de transcrição, tempo do modelo, tempo até o primeiro som, interrupções e ferramentas acionadas.
- Painel simples no Super Admin com a latência média de cada etapa, para saber onde está o gargalo real.
- Tratamento explícito de falhas de crédito, limite de requisições e permissão de microfone, em linguagem humana.

## Detalhes técnicos
- Captura via Web Audio com processamento de PCM, energia por quadro para detecção de fala e codificação de trechos completos antes do envio — nunca fragmentos sem cabeçalho.
- Transcrição e síntese continuam nas funções de backend já existentes (`ai-speech-to-text` e `ai-text-to-speech`), com o segredo de IA sempre no servidor.
- A síntese permanece em PCM com reprodução agendada e cancelável, aproveitando o mecanismo atual de fala.
- O prompt da Marina passa a receber o canal ativo (voz ou texto) e as regras de fala: respostas curtas, sem markdown, sem ler símbolos, e confirmação obrigatória antes de escrever.
- O resumo de sessão roda no backend, em segundo plano, sem bloquear a resposta ao usuário.
- Recursos de microfone e áudio degradam para web quando o ambiente nativo não estiver disponível.
- Funções novas ou alteradas ficam registradas na configuração do backend com verificação de sessão, mantendo a validação de usuário atual.

## Fora deste plano
- Latência de 100–300ms e leitura de entonação/ironia: só com modelo de áudio nativo em conta própria.
- Vídeo, compartilhamento de tela e tradução simultânea.
- Vários agentes em processos separados: a orquestração continua sendo a Marina chamando ferramentas, que é o equivalente funcional aqui.
