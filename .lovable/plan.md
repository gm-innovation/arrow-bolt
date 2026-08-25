# Marina com presença humana no WhatsApp ("digitando..." / "gravando áudio...")

Sim, dá. A Evolution API expõe o estado de presença do WhatsApp, então a Marina pode aparecer como "digitando..." enquanto pensa e "gravando áudio..." antes de mandar uma resposta em voz — exatamente como uma pessoa.

## Como vai funcionar

1. Assim que uma mensagem chega (texto ou áudio), a Marina marca leitura da mensagem e entra em **"digitando..."** no mesmo instante.
2. Enquanto ela pensa/consulta Omie, Auvo, EVA (pode levar dezenas de segundos), a presença é **renovada periodicamente**, porque o WhatsApp expira o indicador em poucos segundos. Sem isso, o "digitando" desaparece no meio da espera.
3. Se a resposta for em voz, ela troca para **"gravando áudio..."** durante a síntese, e só então envia o áudio.
4. Ao enviar a resposta (texto ou áudio), a presença volta para **"disponível"/parada**.
5. Em grupos vale a mesma coisa: a presença é enviada para o JID do grupo.
6. Um pequeno atraso natural antes de textos muito curtos evita a sensação de resposta instantânea de robô (configurável, padrão curto).

Isso substitui parte da necessidade das mensagens de "estou sincronizando, já retorno": elas continuam para operações realmente longas, mas o indicador de digitação já dá o sinal de vida imediato.

## Detalhes técnicos

- `supabase/functions/_shared/channels.ts`: adicionar ao `ChannelAdapter` os métodos opcionais `setPresence({ to, state })` (`composing` | `recording` | `paused` | `available`) e `markRead(message)`. No `EvolutionAdapter`, implementar via `chat/sendPresence` (body `{ number, delay, presence }`) e `chat/markMessageAsRead`. Falha de presença nunca derruba o fluxo: apenas log.
- `supabase/functions/_shared/presence.ts` (novo): helper `startPresenceHeartbeat(adapter, to, state, intervalMs = 4000)` que envia a presença imediatamente e reenvia em intervalo até `stop()`, com `stop()` idempotente e limite de duração para não vazar timers.
- `supabase/functions/whatsapp-in/index.ts`: iniciar o heartbeat `composing` logo após resolver `replyTo` e a identidade; trocar para `recording` no trecho que gera o áudio (perto do `adapter.sendAudio`); chamar `stop()` em `finally`, antes de enfileirar/enviar a resposta.
- `supabase/functions/whatsapp-out/index.ts`: ao drenar a fila, enviar `composing` breve antes de cada `sendText` da mensagem, para que mensagens enfileiradas (alertas, avisos de progresso) também tenham o indicador.
- Sem mudança de schema. Nenhuma nova credencial: usa a mesma instância/apikey da Evolution já configurada.

## Fora de escopo

O chat web já mostra o estado de "pensando" da Marina; nada muda lá.
