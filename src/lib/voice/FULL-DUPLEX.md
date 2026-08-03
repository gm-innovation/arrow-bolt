# Ponto de troca: encadeado → full-duplex

Hoje a voz da Marina roda em **modo encadeado**: microfone → transcrição
(`ai-speech-to-text`) → modelo (`ai-assistant`) → síntese (`ai-text-to-speech`) →
áudio. Latência realista por turno: 1,5s a 3s.

Toda essa mecânica vive atrás de um contrato único, `VoiceSession`, definido em
`src/lib/voice/transport.ts`. O chat (`src/components/ai/AIChat.tsx`) só conhece
esse contrato.

## Peças

| Arquivo | Papel |
| --- | --- |
| `src/lib/voice/transport.ts` | O contrato. Não depende de nenhuma implementação. |
| `src/hooks/useVoiceSession.ts` | Implementação encadeada (a única hoje). |
| `src/hooks/useLiveVoice.ts` | Detalhe interno do encadeado: microfone, detecção de fala/silêncio, interrupção, transcrição por trecho. |
| `src/hooks/useSpeechQueue.ts` | Detalhe interno do encadeado: fila de síntese frase a frase, cancelável. |
| `src/hooks/useVoiceTelemetry.ts` | Detalhe interno: latência por turno e compactação de memória. |
| `src/components/ai/LiveVoiceBar.tsx` | Interface. Lê só os estados do contrato. |

## Para entrar com full-duplex real

Criar `src/hooks/useRealtimeVoiceSession.ts` implementando o mesmo contrato
`VoiceSession`, e trocar a chamada no `AIChat`. Nada mais no chat muda.

**O que a implementação full-duplex dispensa:**

- detecção de silêncio no navegador — quem decide o fim do turno é o servidor;
- transcrição por trecho (`ai-speech-to-text`) — o áudio vai direto no canal;
- fila de síntese (`ai-text-to-speech`, `useSpeechQueue`) — o áudio chega pronto;
- o campo `assistant` do config, que existe só para a saída encadeada.

**O que ela precisa fornecer:**

- uma Edge Function nova que emita **credencial efêmera** da sessão realtime — a
  chave da conta própria fica no servidor e **nunca** vai ao navegador;
- negociação do canal de áudio (WebRTC: oferta/resposta SDP; ou WebSocket),
  com a faixa do microfone entrando e a faixa da Marina saindo;
- declaração do prompt da Marina e das ferramentas dela **na abertura da
  sessão**, em vez de a cada requisição — o prompt e as ferramentas continuam
  sendo os mesmos de `supabase/functions/ai-assistant`;
- execução das ferramentas no cliente encaminhando para o backend, mantendo a
  confirmação falada obrigatória antes de qualquer escrita.

**O que ela precisa manter igual:**

- os mesmos valores de `VoiceSessionState`, para a barra de voz não mudar;
- o mesmo registro por turno em `ai_voice_turns` (com `transcribeMs` em 0 e
  `firstAudioMs` medido no primeiro pacote de áudio recebido), para o painel de
  latência continuar comparável.

Nenhuma chave de terceiros está configurada hoje. A troca depende dessa decisão.
