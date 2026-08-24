# WhatsApp da Marina via Evolution API

Guia de ativação do canal WhatsApp da Marina. O sistema já está pronto — a
ativação depende apenas de hospedar a Evolution API e cadastrar os segredos.

## Arquitetura

```text
WhatsApp ↔ Evolution API ──webhook──> whatsapp-in ──> ai-assistant (Marina)
                                           │
                                           └──────> whatsapp_outbox ──> whatsapp-out ──> Evolution API
```

- **whatsapp-in**: valida o segredo do webhook, deduplica por ID da mensagem,
  resolve a identidade do remetente em `channel_identities` e chama a Marina
  com o perfil do colaborador. Respostas entram na fila `whatsapp_outbox`.
- **whatsapp-out**: drena a fila e envia via Evolution API (`POST /message/sendText/{instance}`).
- **Vínculo de número**: o colaborador gera um código de 6 dígitos em
  Configurações > Assistente > WhatsApp da Marina e envia o código pelo
  WhatsApp. Sem QR code e sem senha — a conexão da instância usa o
  **código de pareamento** da Evolution (pairing code), configurado no
  servidor da Evolution, fora do Arrow.

## Credenciais necessárias

| Valor | Uso |
| --- | --- |
| URL da API | URL base da Evolution (ex.: `https://evo.seudominio.com`) |
| Instância | Nome da instância |
| API key | API key global ou da instância |
| Token do webhook | Segredo que valida o webhook (gerado pelo botão "Gerar" no painel) |

O cadastro é feito **pela tela**: `/super-admin/api-docs` → aba "WhatsApp
(Evolution)" → card "Credenciais da Evolution". Os valores são criptografados
(AES-GCM) e gravados na tabela server-only `integration_settings`; a chave de
criptografia vive no segredo `APP_CONFIG_ENCRYPTION_KEY`.

Fallback legado: as variáveis de ambiente `EVOLUTION_API_URL`,
`EVOLUTION_INSTANCE`, `EVOLUTION_API_KEY` e `EVOLUTION_WEBHOOK_TOKEN`
(Cloud → Secrets) continuam valendo quando não há configuração no banco.

Sem credenciais, `whatsapp-in` responde `{"configured": false}` e
`whatsapp-out` mantém as mensagens na fila — nada falha silenciosamente.

## Configuração da Evolution

1. Suba a Evolution API v2 no servidor e crie a instância.
2. Conecte a instância ao WhatsApp usando **código de pareamento**: em
   `/super-admin/api-docs` → aba "WhatsApp (Evolution)", informe o número
   corporativo e clique em "Gerar código de pareamento"; digite o código
   exibido no WhatsApp (Aparelhos conectados → Conectar aparelho → Conectar
   com número de telefone) — sem QR code.
3. Configure o webhook da instância:
   - URL: `https://<backend>/functions/v1/whatsapp-in?token=<EVOLUTION_WEBHOOK_TOKEN>`
   - Evento: `messages.upsert`
4. Envie uma mensagem de teste de um número vinculado e verifique a fila
   `whatsapp_outbox` (visível para coordenação/diretoria).

## Regras do canal

- Somente colaboradores: números não vinculados recebem apenas o convite de
  vinculação; grupos e broadcasts são ignorados.
- A Marina roda com o papel do colaborador (mesmas ferramentas do chat web) e
  as escritas seguem o fluxo de confirmação ("CONFIRMO") pelo WhatsApp mesmo.
- Respostas em texto puro, quebradas em partes de até ~1500 caracteres.
