## Objetivo
Bot no **Microsoft Teams** onde o usuário conversa (texto ou áudio) e a **Marina** executa ações no Arrow em nome dele — respeitando RLS e o papel de cada usuário. Marina pode responder em texto, áudio, ou ambos.

## Arquitetura

```text
Usuário no Teams (texto ou áudio)
   ↓
Microsoft Bot Framework (Azure)
   ↓ webhook HTTPS
Edge Function: teams-bot-webhook
   ├─ valida assinatura da Microsoft
   ├─ mapeia teams_user_id → arrow user_id (via teams_bot_bindings)
   ├─ se áudio sem transcript → Lovable AI STT (openai/gpt-4o-mini-transcribe)
   ├─ chama Marina (ai-assistant) com userId, companyId, channel="teams"
   ├─ se resposta em áudio → Lovable AI TTS (openai/gpt-4o-mini-tts)
   │  └─ salva MP3 em bucket privado marina-audio + URL assinada
   └─ devolve Adaptive Card (texto + botão de áudio quando aplicável)
   ↓
Teams renderiza resposta com player nativo
```

## Componentes

### 1. Registro do bot no Azure (feito pelo usuário)
- Criar Azure Bot Service (plano F0 grátis)
- Habilitar canal Microsoft Teams
- Obter **App ID** e **App Password**
- Configurar endpoint: `https://<proj>.supabase.co/functions/v1/teams-bot-webhook`
- Documentação passo-a-passo será entregue junto ao código

### 2. Nova tabela `teams_bot_bindings`
```
id, arrow_user_id (FK profiles), teams_user_id, teams_tenant_id,
teams_conversation_id, audio_response_mode (always|only_on_voice|never),
linked_at, last_active_at
```
- RLS: usuário só vê próprio binding; `super_admin` vê todos
- GRANT para `authenticated` e `service_role`

### 3. Fluxo de vinculação (primeiro contato)
1. Bot responde com card contendo link único: `/teams/link?token=<jwt_curto>`
2. Usuário abre no navegador → login normal no Arrow
3. Página `TeamsLinkPage.tsx` grava binding via Edge Function `teams-bind`
4. A partir daí toda mensagem daquele `teams_user_id` é atendida como o usuário Arrow correspondente

### 4. Edge Function `teams-bot-webhook`
Fluxo por mensagem recebida:
1. Verifica JWT da Microsoft (`Authorization: Bearer`)
2. Extrai `from.id`, `conversation.id`, `text`, `attachments`
3. Busca binding em `teams_bot_bindings`
4. Se não vinculado → responde card de vinculação
5. Se **mensagem de voz**:
   - Se Teams entregou transcript → usa direto
   - Se não → baixa áudio → chama Lovable AI STT (`openai/gpt-4o-mini-transcribe`) → obtém texto
6. Chama Marina (`ai-assistant`) com `userId`, `companyId`, `message`, `channel: "teams"`
7. Recebe resposta em texto da Marina
8. Se `audio_response_mode` exigir voz:
   - Chama Lovable AI TTS (`openai/gpt-4o-mini-tts`, voz `alloy`, pt-BR)
   - Salva MP3 em bucket privado `marina-audio` (path: `{user_id}/{hash}.mp3`)
   - Gera URL assinada de 24h
9. Monta Adaptive Card com texto + (opcional) media block de áudio
10. Retorna resposta ao Teams

### 5. Regra de resposta em áudio
| Entrada do usuário | `audio_response_mode` = `only_on_voice` (padrão) | `always` | `never` |
|---|---|---|---|
| Texto | Texto + botão "🔊 Ouvir" | Texto + áudio auto | Só texto |
| Áudio | Áudio + transcrição visível | Áudio + transcrição | Só texto (com transcrição) |

Comandos no bot para o usuário mudar preferência:
- `/audio on` → `always`
- `/audio off` → `never`
- `/audio auto` → `only_on_voice`

### 6. Voz da Marina (Lovable AI TTS)
- Modelo: `openai/gpt-4o-mini-tts`
- Voz padrão: `alloy` (neutra, profissional)
- `response_format: "mp3"` (não streaming — Teams precisa do arquivo completo)
- `instructions`: "Fale em português do Brasil, tom profissional-amigável, ritmo natural"
- Cache: hash SHA256 de `texto + voz` como chave → reaproveita MP3 se resposta idêntica
- Textos longos: usar chunking automático (< 400 palavras por chamada, concatenar áudios)

### 7. Adaptação da Marina (`ai-assistant`)
Adicionar parâmetro `channel: "web" | "teams"`:
- Em `teams`: respostas mais curtas e diretas, evitar markdown pesado (Teams renderiza limitado)
- Preservar toolset atual e auditoria em `ai_assistant_actions` (adicionar `source: "teams"`)

### 8. Página de vinculação `TeamsLinkPage.tsx`
- Rota pública `/teams/link`
- Verifica sessão; se ausente redireciona para `/login?next=/teams/link?token=...`
- Chama Edge Function `teams-bind` que valida JWT e cria binding
- Tela de sucesso com instruções para voltar ao Teams

### 9. Bucket de áudio
- `supabase--storage_create_bucket`: `marina-audio` (privado)
- Path: `teams-responses/{arrow_user_id}/{sha256}.mp3`
- RLS: só o dono lê; service_role escreve
- Limpeza automática: cron mensal remove arquivos > 30 dias

### 10. Secrets necessários
- `TEAMS_BOT_APP_ID` (via `add_secret`)
- `TEAMS_BOT_APP_PASSWORD` (via `add_secret`)
- `TEAMS_LINK_JWT_SECRET` (via `generate_secret`)
- `LOVABLE_API_KEY` (já existe)

## Ferramentas expostas via Teams (fase 1 — leitura + ações reversíveis)
Reusa toolset da Marina:
- Consultar OS ("liste minhas OS abertas", "status da OS 1234")
- Consultar notificações não lidas
- Marcar notificação como lida
- Abrir ticket de suporte
- Consultar calendário de férias/escalas
- Consultar KPIs relevantes ao papel

Fase 2 (após validação): aprovar medições, criar OS, mover tickets no roadmap PM.

## Segurança
- Verificação de assinatura da Microsoft em toda requisição
- Binding 1:1 impede spoofing de identidade Teams
- Todas as chamadas de dados passam pela Marina com `userId` correto → RLS aplicado
- Escritas auditadas em `ai_assistant_actions` com `source: "teams"`
- Comando `/desvincular` para romper binding a qualquer momento
- URLs de áudio assinadas (24h) e revogáveis
- Áudio armazenado em bucket privado, path escopado por usuário

## Escopo desta implementação
1. Migration: `teams_bot_bindings` + RLS + grants
2. Bucket `marina-audio` (privado) + policies
3. Edge Function `teams-bot-webhook` (webhook + STT + roteamento + TTS)
4. Edge Function `teams-bind` (criação do binding autenticado)
5. Página `TeamsLinkPage.tsx` + rota em `App.tsx`
6. Adaptação de `ai-assistant` para canal `teams` (formato conciso + source)
7. Templates de Adaptive Card: lista OS, notificações, mensagens gerais, resposta com áudio
8. Comandos de preferência (`/audio on|off|auto`, `/desvincular`)
9. Cache de TTS (hash → path do MP3)
10. Configurar 3 secrets
11. Documentação passo-a-passo para configurar Azure Bot Service

## Fora do escopo (fases seguintes)
- **WhatsApp**: exige Meta Business verificada + templates aprovados; plano separado
- **Ligação de voz completa via Teams**: Azure Communication Services, plano separado
- **Notificações proativas Arrow → Teams**: bot proativo com `serviceUrl` armazenado, plano separado
- **Ações de escrita completas via Teams** (aprovar medição, criar OS): aguardar validação da fase 1

## Estimativa
- Backend + webhook + STT/TTS: ~700 linhas TS
- Página de vinculação: ~150 linhas TSX
- Adaptive Cards: ~250 linhas
- Ajustes na Marina: ~100 linhas
- **Total: ~1,5 dia de desenvolvimento + tempo do usuário para configurar Azure Bot Service**
- **Custo operacional**: baixo — TTS ~R$ 0,001-0,005 por resposta curta, STT ~R$ 0,01 por minuto de áudio
