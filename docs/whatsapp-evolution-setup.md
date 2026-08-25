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
  resolve a identidade do remetente em `channel_identities` (com auto-vínculo
  pelo cadastro do RH) e chama a Marina com o perfil do colaborador. Respostas
  entram na fila `whatsapp_outbox`.
- **whatsapp-out**: drena a fila e envia via Evolution API (`POST /message/sendText/{instance}`).
- **Identificação do colaborador**: automática, sem código. Na primeira
  mensagem, `whatsapp-in` chama `resolve_employee_by_phone`, que compara o
  número (normalizado: com/sem DDI 55 e com/sem 9º dígito) com
  `profiles.phone` e `hr_employee_contacts` (telefone/celular/whatsapp).
  Achou exatamente um colaborador ativo → cria o vínculo em
  `channel_identities` e a Marina já responde com as permissões dele.
  Número desconhecido, duplicado ou de desligado recebe recusa educada e a
  mensagem não chega à IA.
- **Pareamento da instância** (o número da Marina, não dos colaboradores):
  usa o **código de pareamento** da Evolution (pairing code), gerado no
  painel do Super Admin — sem QR code.

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

1. Suba a Evolution API v2 no servidor e salve as credenciais no painel
   (`/super-admin/api-docs` → aba "WhatsApp (Evolution)").
   - A URL deve ser a **raiz da API** (ex.: `http://<servidor>:<porta>`), não a
     URL do Manager — o painel remove sufixos `/manager/...` automaticamente.
2. Conecte a instância ao WhatsApp usando **código de pareamento**: no mesmo
   painel, informe o número corporativo e clique em "Gerar código de
   pareamento"; digite o código exibido no WhatsApp (Aparelhos conectados →
   Conectar aparelho → Conectar com número de telefone) — sem QR code.
   - Se a instância não existir, ela é criada automaticamente
     (`WHATSAPP-BAILEYS`, sem QR) — exige a **chave global** da Evolution
     (`AUTHENTICATION_API_KEY`). Se a criação automática falhar com 403, crie
     a instância manualmente no Manager com o mesmo nome e gere o código
     novamente.
   - Ao gerar o código, o **webhook da instância é configurado
     automaticamente** para `https://<backend>/functions/v1/whatsapp-in?token=...`
     com o evento `MESSAGES_UPSERT` (`webhookBase64` ligado para suportar
     áudios/imagens). Se precisar reconfigurar, gere o código novamente ou
     cadastre a URL manualmente (ela aparece uma única vez ao salvar o token;
     depois fica mascarada).
4. Envie uma mensagem de teste de um número cadastrado no RH (o vínculo é
   automático na primeira mensagem) e verifique a fila `whatsapp_outbox`
   (visível para coordenação/diretoria).

## Regras do canal

- Somente colaboradores: números fora do cadastro do RH recebem recusa
  educada e a conversa não avança; grupos só avançam com menção à Marina.
- A Marina roda com o papel do colaborador (mesmas ferramentas do chat web) e
  as escritas seguem o fluxo de confirmação ("CONFIRMO") pelo WhatsApp mesmo.
- Respostas em texto puro, quebradas em partes de até ~1500 caracteres.
- **Imagens**: foto, figurinha e imagem enviada como documento são lidas pela
  Marina (visão). A legenda vira o pedido; sem legenda ela analisa e descreve.
  Limite de 5 MB por imagem — acima disso ela explica o limite.
- **Nunca em silêncio**: áudio incompreensível, mídia não suportada ou download
  falho geram resposta pedindo texto/reenvio.

## Diagnóstico ("a mensagem não chegou")

Toda chegada de webhook é registrada em `whatsapp_webhook_events`, inclusive as
descartadas, com remetente, tipo da mensagem, se era grupo e o motivo
(`ignored_group_without_mention`, `refused_unknown_number`, `unsupported_media`,
`deduplicated`, `accepted`…). O painel `/super-admin/api-docs` → aba "WhatsApp
(Evolution)" mostra:

- estado da instância e o webhook configurado na Evolution (URL mascarada,
  se está ativo e quais eventos — alerta quando falta `MESSAGES_UPSERT`);
- as 20 últimas chegadas com o resultado de cada uma.

Se o colaborador diz que mandou mensagem e nada aparece na lista, o problema
está antes do Arrow (webhook/Evolution), não na Marina.

## Fila de saída

`whatsapp_outbox` é drenada pelo `whatsapp-out`: imediatamente após cada
resposta e pelo cron `whatsapp-out-drain` (a cada minuto), que autentica com o
segredo compartilhado dos crons (`x-cron-secret`). É por essa fila que saem
também as notificações do sistema (novos chamados de suporte, avisos de
sincronização concluída) — o provedor antigo (Twilio) não é mais usado.

