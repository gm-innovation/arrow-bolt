# Painel de Configuração da Evolution API no Super Admin

## Contexto

A infraestrutura de backend para a Marina no WhatsApp já está pronta: webhook `whatsapp-in`, dreno `whatsapp-out`, adaptador `EvolutionAdapter` e o card de vínculo do colaborador em `/account`. No entanto, **não existe nenhuma tela no app** onde o Super Admin configure ou monitore a Evolution API. Hoje os 4 segredos (`EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_TOKEN`) só podem ser cadastrados via o cofre seguro do projeto (Project Settings → Secrets), o que não é visível nem operável de dentro do app.

## O que será construído

### 1. Edge Function `whatsapp-config` (health check e status)

Nova Edge Function `supabase/functions/whatsapp-config/index.ts` com `verify_jwt = true`:

- **GET** → retorna status da integração:
  - `configured`: se os 4 segredos estão presentes no ambiente
  - `instance`: nome da instância (se configurada)
  - `apiUrl`: URL base (se configurada) — mascarada parcialmente
  - `webhookUrl`: URL completa do webhook para copiar (`https://<project>/functions/v1/whatsapp-in?token=***`)
  - `instanceStatus`: chama `GET /instance/connectionState/{instance}` na Evolution API para verificar se o número está conectado
  - `pendingMessages`: contagem de mensagens na `whatsapp_outbox` com status pendente/falha
  - `linkedNumbers`: contagem de colaboradores vinculados em `channel_identities`
- **POST** com `{ action: "test" }` → envia uma mensagem de teste para um número informado pelo admin, validando ponta-a-ponta a Evolution API

Registrar em `supabase/config.toml` com `verify_jwt = true`.

### 2. Componente `EvolutionAPIConfig.tsx`

Novo componente em `src/components/super-admin/settings/EvolutionAPIConfig.tsx`:

- **Card de Status**: badge "Conectado" / "Não configurado" / "Instância desconectada", com indicador visual (verde/amarelo/vermelho)
- **Webhook URL**: campo read-only com botão "Copiar" — a URL que deve ser cadastrada na Evolution API
- **Botão "Testar conexão"**: chama o POST de teste da edge function com um número informado
- **Painel de instruções** (acordeão ou Card):
  1. Como subir a Evolution API v2
  2. Como conectar a instância via código de pareamento (sem QR)
  3. Onde cadastrar o webhook (URL + evento `messages.upsert`)
  4. Quais são os 4 segredos e que devem ser cadastrados em Project Settings → Secrets do Lovable
- **Métricas rápidas**: mensagens na fila, colaboradores vinculados
- **Aviso de segurança**: lembra que a API key e o webhook token são segredos e nunca aparecem em texto plano no app

### 3. Integração na tela de Settings do Super Admin

Em `src/pages/super-admin/Settings.tsx`, adicionar uma nova seção abaixo do card de WhatsApp existente (ou substituir o card antigo de "Integração WhatsApp" que ainda referencia Twilio):

- Nova seção "Evolution API (Marina WhatsApp)" renderizando `EvolutionAPIConfig`
- O card antigo de WhatsApp (que fala em Twilio e `whatsapp_api_key`) será substituído pelo novo painel, já que a Evolution API é o provedor real

### 4. Limpeza do painel antigo de Twilio

O `WhatsAppSettingsTab` em `src/components/admin/settings/WhatsAppSettingsTab.tsx` ainda referencia Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`). Este painel controla notificações push-style e pode permanecer para notificações operacionais, mas o texto de "Requisitos" será atualizado para não confundir com a Evolution API.

## Fluxo operacional resultante

```text
Super Admin abre /super-admin/settings
  → vê status da Evolution API (conectada / não configurada)
  → copia a webhook URL
  → cadastra os 4 segredos no cofre do projeto (Project Settings → Secrets)
  → testa a conexão com um número
  → monitora fila e vinculados

Colaborador abre /account/settings → aba WhatsApp
  → gera código de 6 dígitos
  → envia o código pelo WhatsApp para a Marina
  → vínculo concluído
```

## Arquivos a criar/editar

| Arquivo | Ação |
| --- | --- |
| `supabase/functions/whatsapp-config/index.ts` | Criar — health check + teste |
| `supabase/config.toml` | Editar — registrar `whatsapp-config` |
| `src/components/super-admin/settings/EvolutionAPIConfig.tsx` | Criar — painel de config |
| `src/pages/super-admin/Settings.tsx` | Editar — adicionar seção Evolution API |
| `src/components/admin/settings/WhatsAppSettingsTab.tsx` | Editar — atualizar texto de requisitos |

## Observações técnicas

- Os 4 segredos são credenciais de infraestrutura e **não podem ser escritos pelo app em runtime** — ficam no cofre do Lovable. O painel mostra status e instruções; o cadastro dos valores é feito via Project Settings → Secrets (ou eu faço via `add_secret` quando você tiver os valores).
- A URL e o nome da instância não são secretos, mas o adaptador atual lê do `Deno.env.get()`. Para simplificar, mantemos os 4 como segredos por enquanto.
- A Edge Function de health check usa `verify_jwt = true` (só Super Admin/director acessam).
