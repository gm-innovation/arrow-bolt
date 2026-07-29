## Objetivo
Habilitar **voz na Marina dentro do próprio Arrow** (chat web + PWA), permitir **colar/anexar imagens no chat**, e deixar a arquitetura pronta para **trocar de provedor de IA** (Lovable AI, OpenRouter ou OpenAI/ChatGPT direto) e para **novos canais** (Teams) — tudo sem refazer nada depois.

## Estado atual verificado
- `src/components/ai/AIChat.tsx` (461 linhas) — chat da Marina, hoje **só texto + anexos por botão**. Sem voz, sem colar imagem.
- `supabase/functions/ai-assistant/index.ts` (1276 linhas) — cérebro da Marina, com toolset e auditoria; hoje aponta direto para o gateway Lovable.
- Tabela **`ai_channel_bindings` já existe** — ponto de extensão pronto para Teams.
- Tabela **`ai_agents`** já existe com config por empresa — servirá para guardar a escolha de provedor.

## Arquitetura

```text
┌─────── CANAIS (plugável) ───────┐   ┌─── PROVEDORES (plugável) ───┐
│ web/PWA ✅  teams 🔜  whatsapp  │   │ lovable ✅  openrouter 🔜   │
└──────────────┬──────────────────┘   │ openai 🔜                   │
               ↓                      └──────────────┬──────────────┘
     _shared/channel.ts                              ↓
               └──────────► ai-assistant ◄─── _shared/ai-provider.ts
                             ↑        ↓
                  ai-speech-to-text  ai-text-to-speech
```

---

## Onda 1 — Voz no chat interno

### 1. Edge Function `ai-speech-to-text`
- `multipart/form-data`, valida sessão com `getUser()` (sem fallback anon)
- Encaminha para `/v1/audio/transcriptions`, modelo `openai/gpt-4o-mini-transcribe`, `stream: "true"`
- Repassa o SSE sem bufferizar → transcrição aparece palavra a palavra
- Erros 400/402/429 traduzidos para pt-BR

### 2. Edge Function `ai-text-to-speech`
- `{ text, voice? }`, valida sessão
- `/v1/audio/speech`, modelo `openai/gpt-4o-mini-tts`, voz `alloy`, `response_format: "pcm"`, SSE
- `instructions`: "Fale em português do Brasil, tom profissional e acolhedor"
- Divide textos longos em blocos (~400 palavras) para não estourar limite

### 3. `src/hooks/useVoiceRecorder.ts`
- Captura via **Web Audio API (PCM)** — não `MediaRecorder`, que gera MP4 fragmentado no Safari/iOS e quebra a transcrição
- Encoda **WAV 16 kHz mono completo** antes de enviar
- Rejeita gravação vazia (< 2 KB) com aviso amigável
- Expõe `isRecording`, `duration`, `start/stop/cancel`, tratamento de permissão negada

### 4. `src/hooks/useSpeechPlayback.ts`
- Consome SSE, decodifica PCM base64 e agenda no `AudioContext` 24 kHz
- Resume de contexto suspenso (iframe do preview e iOS)
- Expõe `isSpeaking`, `speak(text)`, `stop()`

### 5. UI de voz no `AIChat.tsx`
- **Botão de microfone** ao lado do anexo; gravando → quadrado vermelho pulsante + cronômetro `00:12` + botão X para cancelar
- Ao parar: transcrição vai para o **campo de texto** (usuário revisa antes de enviar), com placeholder "Transcrevendo…"
- **Botão "🔊 Ouvir"** em cada resposta da Marina
- **Toggle "Resposta em voz"**: `off` (padrão) / `auto` (fala quando a pergunta veio por voz) / `on` (sempre)
- Preferência salva em nova coluna `profiles.voice_pref` (`off|auto|on`, default `off`), com fallback `localStorage`

---

## Onda 2 — Imagens no chat (colar, arrastar, capturar)

### 6. `src/hooks/useChatImagePaste.ts`
- Listener de `paste` no container do chat: captura `clipboardData.items` do tipo `image/*` (print de tela vai direto)
- **Drag & drop** de imagem sobre a área do chat com overlay "Solte a imagem aqui"
- Botão de câmera no mobile (`capture="environment"`)
- Validação: só `image/png|jpeg|webp|gif`, máx. 10 MB, máx. 5 imagens por mensagem
- Compressão via canvas antes do upload (lado maior 1600 px, JPEG q0.85) — corta drasticamente custo de token e tempo

### 7. Armazenamento e envio
- Upload para bucket **`marina-chat-images`** (privado), caminho `{company_id}/{user_id}/{uuid}.jpg`
- RLS: usuário lê/escreve só o próprio caminho; RH/admin sem acesso extra
- No envio, gera **signed URL** (1 h) e monta o bloco multimodal:
  `{"type":"image_url","image_url":{"url":"<signed>"}}`
- Se o modelo ativo não aceitar imagem, avisa em pt-BR e sugere trocar de modelo

### 8. UI de imagens
- **Miniaturas** acima do campo de texto com botão X para remover
- Barra de progresso por imagem durante upload
- Imagens já enviadas aparecem na bolha da mensagem, clicáveis para ampliar (lightbox)
- Marina passa a **entender prints de erro** — casa direto com o fluxo de tickets de suporte

---

## Onda 3 — Camada de provedor de IA (Lovable / OpenRouter / OpenAI)

### 9. `supabase/functions/_shared/ai-provider.ts`
Resolve o provedor em tempo de execução, mantendo corpo OpenAI-compatible:

```ts
type ProviderId = "lovable" | "openrouter" | "openai";

interface ResolvedProvider {
  id: ProviderId;
  baseUrl: string;
  headers: Record<string, string>;
  model: string;
  supportsVision: boolean;
  supportsTools: boolean;
}
```

| Provedor | Base URL | Auth | Chave |
|---|---|---|---|
| `lovable` (padrão) | `https://ai.gateway.lovable.dev/v1` | `Lovable-API-Key` | já existe |
| `openrouter` | `https://openrouter.ai/api/v1` | `Authorization: Bearer` | `OPENROUTER_API_KEY` (secret, sob demanda) |
| `openai` | `https://api.openai.com/v1` | `Authorization: Bearer` | `OPENAI_API_KEY` (secret, sob demanda) |

- Normaliza diferenças conhecidas: GPT-5 rejeita `max_tokens`/`temperature` → usa `max_completion_tokens`; GPT-5.6 exige `reasoning_effort: "none"` com tools; OpenRouter aceita headers `HTTP-Referer`/`X-Title`
- **Fallback automático**: se o provedor escolhido falhar com 5xx/timeout, cai para `lovable` e registra em `ai_integration_logs`
- Chaves só existem no servidor — **nunca** no frontend

### 10. Configuração por empresa
- Novas colunas em `ai_agents`: `provider` (default `lovable`), `model`, `fallback_enabled` (default `true`)
- Aba **"Provedor de IA"** em `/super-admin/ai-management`:
  - Seleção de provedor + modelo (lista carregada dinamicamente do OpenRouter quando aplicável)
  - Indicador de status da chave: `✅ configurada` / `⚠️ não configurada`
  - Botão **"Testar conexão"** que faz uma chamada real e mostra latência e resposta
- STT/TTS **continuam sempre no Lovable AI** (OpenRouter não oferece esses endpoints) — deixado explícito na UI

### 11. `ai-assistant` refatorado
- Passa a montar o request via `ai-provider.ts` em vez de URL fixa
- Novo parâmetro `channel: "web" | "teams" | "whatsapp"` (default `web`) e `input_mode: "text" | "voice"`
- Em `input_mode: "voice"`: instrução extra para respostas curtas e sem markdown pesado (ruim de ouvir)
- Registra `provider`, `model`, `channel`, `input_mode` em `ai_assistant_actions` para auditoria e custo

---

## Onda 4 — Preparação para o Teams (estrutura agora, ativação depois)

### 12. `supabase/functions/_shared/channel.ts`
```ts
export interface ChannelAdapter {
  id: "web" | "teams" | "whatsapp";
  formatResponse(text: string, opts: { audioUrl?: string; images?: string[] }): unknown;
  maxLength: number;          // web: ilimitado · teams: ~4000
  supportsMarkdown: boolean;
  supportsAudio: boolean;
  supportsImages: boolean;
}
```
- `webAdapter` implementado agora; `_shared/channels/teams.ts` como stub documentado com o esboço do Adaptive Card
- Aba **"Canais"** em `/super-admin/ai-management`: `web ✅ ativo`, `teams ⏸ aguardando Azure`, `whatsapp` conforme config

### 13. `docs/marina-canais-e-provedores.md`
- Como funcionam as duas camadas (canal e provedor)
- Checklist do Azure Bot para quando houver subscription (F0, canal Teams, endpoint, App ID + Secret)
- O que falta para o Teams: `teams-bot-webhook`, `teams-bind`, tabela `teams_bot_bindings`, página `/teams/link` (~1 dia)
- Como plugar um novo provedor de IA em ~20 linhas

---

## O que NÃO será feito agora
- Nenhum recurso Azure / Bot Framework (sem subscription)
- Nenhuma chave OpenRouter/OpenAI será solicitada agora — só quando você quiser ativar
- Sem chamada de voz em tempo real (apenas mensagens de voz)
- WhatsApp segue só como notificações

## Escopo de arquivos
| Arquivo | Ação |
|---|---|
| `supabase/functions/ai-speech-to-text/index.ts` | criar |
| `supabase/functions/ai-text-to-speech/index.ts` | criar |
| `supabase/functions/_shared/ai-provider.ts` | criar |
| `supabase/functions/_shared/channel.ts` | criar |
| `supabase/functions/_shared/channels/teams.ts` | criar (stub) |
| `supabase/functions/ai-assistant/index.ts` | editar (provider + canal + imagens) |
| `supabase/config.toml` | editar (`verify_jwt = true` nas novas) |
| `src/hooks/useVoiceRecorder.ts` | criar |
| `src/hooks/useSpeechPlayback.ts` | criar |
| `src/hooks/useChatImagePaste.ts` | criar |
| `src/components/ai/VoiceRecordButton.tsx` | criar |
| `src/components/ai/SpeakMessageButton.tsx` | criar |
| `src/components/ai/ChatImagePreview.tsx` | criar |
| `src/components/ai/AIChat.tsx` | editar (mic, toggle voz, ouvir, colar/arrastar imagem) |
| `src/pages/super-admin/AIManagement.tsx` | editar (abas Provedor e Canais) |
| `docs/marina-canais-e-provedores.md` | criar |
| Migrations | `profiles.voice_pref`, `ai_agents.provider/model/fallback_enabled`, bucket `marina-chat-images` + RLS |

## Custo
- STT ~R$ 0,01/min · TTS ~R$ 0,005/resposta · imagem ~R$ 0,01/print
- Tudo via Lovable AI por padrão — sem chave externa, sem cartão, sem Azure
