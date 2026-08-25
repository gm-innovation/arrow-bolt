# Sincronização, WhatsApp do Cahua e aviso de chamados

## 1. Situação da sincronização (verificado agora)

- **Omie**: rodando normalmente (cron a cada 15 min). 4.961 das 4.972 OSs foram atualizadas nas últimas 2 horas — última às 16:32 (Brasília). A divergência que gerou o chamado #1050 já está sendo coberta por esse ciclo.
- **Auvo (importação histórica de 2025)**: ainda **rodando** — iniciada às 15:36 e parada no bloco `2025-02-01 → 2025-02-28` com 490 tarefas, ou seja, praticamente sem progresso na última hora. Está travada, não concluída.

Ações:
- Encerrar a execução travada, reduzir o tamanho do bloco de datas (quinzenal) e retomar a importação histórica em blocos, com retomada automática de onde parou.
- Ao final, rodar a reconciliação para propagar embarcação/coordenador/escopo para as OSs.
- Fazer a Marina **avisar sozinha no WhatsApp** quando uma sincronização que ela disparou terminar (hoje ela prometeu avisar, mas não existe esse gatilho): registrar o solicitante na execução e enviar a mensagem de conclusão com o resumo (quantas OSs atualizadas, divergências resolvidas).

## 2. Por que a mensagem do Cahua não chegou

Diagnóstico com os dados de hoje:
- O vínculo do Cahua está ativo e verificado (número corporativo dele, última interação ontem 17:48).
- **Nenhuma mensagem dele entrou hoje** — não há registro de entrada, nem tentativa recusada, nem erro de transcrição. As mensagens do seu número no mesmo período entraram normalmente.
- Ou seja: a Evolution não entregou o evento ao Arrow (ou entregou algo que foi descartado silenciosamente). Hoje é impossível provar qual dos dois, porque **só gravamos as mensagens aceitas** — tudo que é ignorado (grupo sem menção, mídia sem texto, token inválido, número não reconhecido) desaparece sem rastro, e os logs das funções só guardam alguns minutos.

Ações:
- **Trilha de recebimento completa**: gravar toda chegada de webhook do WhatsApp com remetente, tipo de mensagem, se era grupo e o motivo do descarte. Assim, qualquer "não chegou" futuro é respondido em segundos.
- **Painel de diagnóstico** na aba WhatsApp do Super Admin: estado da conexão da instância, URL/eventos do webhook configurados na Evolution e as últimas chegadas (aceitas e descartadas). Se o webhook tiver caído ou perdido o evento de mensagens, aparece ali.
- **Nunca ficar em silêncio**: quando chega mídia sem texto (imagem/documento/áudio que não dá para transcrever) de um colaborador conhecido, a Marina responde pedindo o texto, em vez de ignorar.
- Reaplicar a configuração do webhook na instância e validar com uma mensagem de teste do número do Cahua.

## 3. Aviso de chamados no seu WhatsApp

Estado atual: ao abrir um chamado, o sistema só cria notificação no app para os super admins. O envio por WhatsApp existe no despachante central, mas aponta para um provedor antigo (Twilio, sem credenciais) — nunca chega pela Marina. E a fila de saída da Marina só é esvaziada quando alguém fala com ela.

Ações:
- Passar o canal WhatsApp do despachante de notificações para a **Evolution/Marina** (mesma fila que ela já usa), respeitando preferências e horário de silêncio de cada usuário.
- Criar cron de 1 minuto para esvaziar a fila de saída, para os avisos saírem mesmo sem conversa em andamento.
- Todo chamado novo (bug, melhoria ou qualquer categoria), aberto pela tela ou pela própria Marina, gera aviso no seu WhatsApp com número do chamado, categoria, quem abriu, título e resumo, mais o link direto para a caixa de suporte.
- Mesmo tratamento para respostas de usuários em chamados existentes (hoje também só aparecem no app).

## 4. Marina lendo imagens (chat interno e WhatsApp)

- **Chat interno**: o envio de imagem já existe e a imagem já é anexada ao pedido do modelo. O problema é que o modelo configurado do agente sobrescreve a troca automática para um modelo com visão — se a configuração aponta para um modelo sem leitura de imagem, a foto é descartada. Ajuste: quando a mensagem tem imagem, sempre usar um modelo com visão, independente do que estiver configurado, e avisar no chat se a leitura falhar.
- **WhatsApp**: hoje só texto e áudio são tratados. Foto (com ou sem legenda), figurinha e imagem enviada como documento **não são lidas** — a mensagem é descartada em silêncio. Ajuste: baixar a mídia da imagem (do próprio payload ou pela API de mídia, como já é feito com áudio), enviar à Marina junto com a legenda ("o que é isso?", "esse é o equipamento da OS 5551") e responder normalmente. Se a legenda vier vazia, a Marina descreve/analisa a imagem e pergunta o que fazer com ela.
- Limites: aceitar até ~5 MB por imagem e no máximo 3 imagens por mensagem; acima disso a Marina explica o limite em vez de falhar.

## Detalhes técnicos


- `auvo_sync_runs`: encerrar a run `c8e43f6a…` (marcar como erro/expirada via `auvo_expire_stuck_sync_runs`), reduzir o bloco em `auvo-sync` e reenfileirar via `invoke_auvo_sync`; adicionar `requested_by_user_id` + `notify_channel` para o aviso de conclusão.
- Nova tabela `whatsapp_webhook_events` (server-only, RLS + GRANT explícitos) com `payload_summary`, `sender`, `is_group`, `message_kind`, `outcome`; gravada em todos os caminhos de `whatsapp-in`, inclusive nos `ignored`.
- `whatsapp-config`: nova ação `diagnostics` (GET de `instance/connectionState` e `webhook/find` na Evolution) consumida pela aba WhatsApp em `/super-admin/api-docs`.
- `notify-dispatch`: substituir a chamada a `send-whatsapp` (Twilio) por insert em `whatsapp_outbox` + dreno; manter `notification_delivery_log`.
- Trigger `notify_support_ticket_created`: manter os inserts em `notifications` e passar a usar o despachante (via `pg_net` para `notify-dispatch`) para que o WhatsApp saia junto; idem `notify_support_ticket_user_reply`.
- Novo cron `whatsapp-out-drain` (`* * * * *`) chamando `whatsapp-out`.
- `whatsapp-in`: tratar `imageMessage`/`stickerMessage`/`documentMessage` de imagem reusando `getMediaBase64`, montando `attachments: [{ kind: "image", dataUrl }]` na chamada ao `ai-assistant`.
- `ai-assistant`: garantir modelo com visão quando `hasImageAttachment` — hoje `tm.model`/`llmOverride` sobrescrevem a escolha feita na linha 595.

