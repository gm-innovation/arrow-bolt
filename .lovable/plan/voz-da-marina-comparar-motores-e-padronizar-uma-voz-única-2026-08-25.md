# Voz da Marina: comparar motores e padronizar uma voz única

Objetivo: você ouvir a mesma frase nos motores de voz disponíveis, escolher uma, e essa voz passar a valer em todos os canais (chat web, Marina Live e áudios do WhatsApp).

Observação importante: o OpenRouter não oferece síntese de voz — só modelos de texto/visão. Então os candidatos reais são outros.

## Etapa 1 — Laboratório de Voz (comparação)

Nova aba **Voz** em Gestão de Agentes de IA (`/super-admin/ai-management`), com:

- Campo de texto com uma frase padrão já preenchida (algo realista da operação: "Oi, a OS 4319 foi faturada ontem..."), editável.
- Uma linha por candidato, com botão "Ouvir" e indicação de custo/latência:
  - **Gemini TTS** (Lovable AI) — vozes pt-BR naturais, sem chave extra.
  - **OpenAI TTS** (motor atual) — vozes coral / shimmer / sage / nova, com as instruções de entonação atuais.
  - **ElevenLabs** — só aparece habilitado se a conexão ElevenLabs estiver ligada; senão, mostra um aviso com o botão para conectar.
- Controles compartilhados: velocidade e um campo livre de instruções de entonação (para os motores que aceitam).
- Botão **"Definir como voz oficial da Marina"** em cada candidato.

## Etapa 2 — Voz única, padronizada

A escolha é gravada como configuração global do agente (motor + voz + velocidade + entonação), e passa a ser lida por todos os canais:

- Chat web e leitura de mensagens da Marina.
- Marina Live (voz em tempo real).
- Áudios enviados pelo WhatsApp.

Sem voz por usuário: uma só voz para toda a empresa, como você pediu. Se o motor escolhido falhar em algum momento, cai automaticamente para o motor atual (OpenAI) em vez de ficar mudo.

## Etapa 3 — ElevenLabs (opcional, depende da sua decisão)

Só é implementado de fato se você escolher ElevenLabs no comparativo. Nesse caso preciso que você conecte a conta ElevenLabs (a chave fica no servidor, nunca no frontend) — abro o card de conexão na hora.

## Detalhes técnicos

- `supabase/functions/ai-text-to-speech/index.ts`: passa a rotear por `engine` (`gemini` | `openai` | `elevenlabs`), lendo a configuração oficial de `ai_agents.identity` e aceitando override na requisição (usado só pelo laboratório). Gemini usa o corpo nativo do Google (`contents` + `generationConfig.speechConfig`) com `stream_format: "sse"`; OpenAI mantém o corpo atual; ElevenLabs chama `api.elevenlabs.io` com `xi-api-key` e devolve MP3.
- `src/hooks/useSpeechPlayback.ts`: já consome PCM 24kHz via SSE; ganha suporte a resposta MP3 (caminho ElevenLabs) e envia `engine`/`voice`/`speed`/`instructions`.
- `supabase/functions/_shared/voice.ts` (usado pelo WhatsApp, sem sessão): mesma seleção de motor, lendo a configuração oficial do agente.
- `src/hooks/useLiveVoice.ts`: alinhado à voz oficial quando o motor em tempo real suportar; caso não suporte a voz escolhida, mantém a mais próxima e isso fica indicado na tela.
- `src/hooks/useAIAgents.ts`: `AIAgentIdentity` ganha `voice_engine`, `voice`, `voice_speed`, `voice_instructions` (tudo em coluna `jsonb` existente — sem migração).
- Novo `src/components/super-admin/ai/VoiceLabTab.tsx` reutilizando o `VoiceTestButton` existente.
- Erros do gateway de IA (créditos, limite de taxa) aparecem em português na tela, sem retentativa automática em falha definitiva.

Nada de RLS, esquema de banco ou papéis é alterado. Todos os textos visíveis em pt-BR.
