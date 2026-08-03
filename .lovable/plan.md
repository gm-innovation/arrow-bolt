# Camada de transporte de voz isolada (preparar o full-duplex)

Objetivo: deixar a Marina Live funcionando exatamente como hoje, mas com o transporte de áudio atrás de um contrato único. Assim, trocar o modo encadeado (transcrição → modelo → voz) por um modo full-duplex real vira substituir uma peça, sem reescrever a Marina nem o chat.

Nenhuma chave de terceiros é adicionada agora. Nenhuma mudança de comportamento visível para o usuário.

## Situação atual

A lógica de voz está espalhada em três hooks acoplados ao chat:
- `useLiveVoice` — microfone, detecção de fala/silêncio, interrupção, e envia o trecho para transcrição.
- `useSpeechQueue` — fila de síntese frase a frase, cancelável.
- `AIChat` — costura tudo: recebe a transcrição, chama a Marina, fatia a resposta em frases e joga na fila de voz.

Isso significa que o ponto de troca hoje está dentro do `AIChat`, misturado com estado de mensagens e telemetria.

## O que muda

### 1. Contrato único de transporte
Criar uma interface de sessão de voz com apenas o essencial: iniciar, encerrar, interromper, e eventos de estado (ouvindo, falando o usuário, transcrevendo, pensando, falando a Marina), transcrição parcial, transcrição final, nível de voz e métricas do turno.

O chat passa a conversar só com esse contrato. Ele não sabe se por baixo existe transcrição e síntese separadas ou um canal de áudio nativo.

### 2. Implementação encadeada (a atual)
Mover a costura de hoje para uma implementação desse contrato, reaproveitando integralmente `useLiveVoice` e `useSpeechQueue`:
- entrada: microfone e detecção de fala continuam idênticos;
- saída: a fatia de frases da resposta em streaming sai do `AIChat` e passa a viver na implementação;
- interrupção, telemetria por turno e compactação de memória continuam funcionando como hoje.

### 3. O chat fica magro
`AIChat` mantém só: botão de ativar/desativar o modo conversa, exibição dos estados na barra de voz, e o envio da fala do usuário como mensagem. Todo o resto do controle de áudio sai de lá.

### 4. Ponto de troca documentado
Um arquivo de anotação junto da camada de voz descrevendo, em texto, exatamente o que uma implementação full-duplex precisa fornecer e o que ela dispensa:
- dispensa: detecção de silêncio no navegador, transcrição por trecho, fila de síntese;
- exige: uma função no backend que emita credencial efêmera (a chave própria nunca vai ao navegador), negociação do canal de áudio, e declaração do prompt e das ferramentas da Marina na abertura da sessão;
- mantém: os mesmos eventos de estado e a mesma telemetria por turno, para o painel de latência não mudar.

## Como valido

- Ativar o modo conversa, falar, confirmar que a Marina responde por voz.
- Falar durante a resposta e confirmar que ela cala na hora.
- Sair do modo conversa e confirmar que o chat de texto segue normal, com histórico preservado.
- Confirmar que os registros de latência por turno continuam sendo gravados.

## Detalhes técnicos

- Novo contrato e implementação sob `src/lib/voice/` e um hook único de sessão (`useVoiceSession`), que internamente escolhe a implementação encadeada.
- `useLiveVoice`, `useSpeechQueue` e `useVoiceTelemetry` permanecem — passam a ser detalhes internos da implementação encadeada, não mais consumidos direto pelo `AIChat`.
- `LiveVoiceBar` passa a receber os estados do contrato, sem mudança visual.
- As funções de backend de transcrição e síntese não são alteradas.
- Nenhuma migração de banco. Nenhum segredo novo.

## Fora deste plano

- Implementar o transporte full-duplex de fato e a função de credencial efêmera. Isso depende da sua decisão sobre usar conta própria da OpenAI, e entra num plano seguinte.
- Latência de 100–300ms e leitura de entonação: só com modelo de áudio nativo.
