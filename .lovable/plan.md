# Marina: presença humana no WhatsApp + entrega proativa de arquivos da OS

Dois ajustes: (1) ela aparecer como "digitando..." / "gravando áudio..." enquanto trabalha; (2) quando você pede "relatório e medição da OS X", ela entregar os arquivos que casam com esses termos em vez de listar tudo e perguntar.

## Parte 1 — Presença humana no WhatsApp

1. Ao receber a mensagem (texto ou áudio), Marina apenas **marca leitura**. Nada de "digitando" na hora: se a resposta sai rápido, não aparece indicador nenhum, como uma pessoa que só responde.
2. O "digitando..." só entra depois de alguns segundos de espera (padrão ~4s), quando a resposta realmente vai demorar.
3. A partir daí a presença é mantida em **pulsos** — alterna digitando e pausa, como alguém que escreve, pensa e volta a escrever — em vez de um "digitando" contínuo por minutos, que parece carta.
4. Se a resposta for em voz, ela troca para **"gravando áudio..."** durante a síntese e só então envia o áudio.
5. Ao enviar a resposta, a presença volta para parada/disponível. Em grupos vale o mesmo, usando o JID do grupo.


As mensagens de "estou sincronizando, já retorno" continuam para operações realmente longas.

## Parte 2 — Arquivos da OS: filtrar e entregar, não perguntar

Hoje `list_os_attachments` devolve todos os anexos e a resposta vira uma pergunta de volta. Mudanças:

1. **Filtro por intenção**: a listagem passa a aceitar os tipos/termos pedidos (ex.: relatório, medição/fechamento, pedido de compra) e casa tanto pelo tipo classificado quanto pelas palavras no nome do arquivo. Se você pediu "relatório e medição", ela olha só esses.
2. **Entrega automática**: havendo correspondência, ela **envia os arquivos** (documento no WhatsApp, link no chat) na mesma resposta, sem perguntar. Um arquivo por tipo pedido é enviado direto; vários do mesmo tipo, ela envia o mais recente e avisa que existem versões anteriores, oferecendo enviá-las.
3. **Só pergunta quando é realmente ambíguo**: nenhum arquivo casa com o pedido, ou o pedido é genérico ("quais arquivos tem?"). Aí sim ela lista.
4. **Classificação mais robusta**: ampliar os padrões de nome (abreviações e variações como "med.", "medicao final", "rel tec", "RDT", "boletim", "BM", datas no nome) para reduzir arquivos caindo em "outro".
5. **Postura proativa no prompt**: regra explícita de que, quando o pedido permite identificar o item com segurança, ela age e entrega — perguntar de volta é o último recurso, e quando pergunta deve vir junto com o que ela já conseguiu fazer.

## Detalhes técnicos

Presença:
- `_shared/channels.ts`: `ChannelAdapter` ganha `setPresence({ to, state })` (`composing`/`recording`/`paused`/`available`) e `markRead(message)`; no `EvolutionAdapter` via `chat/sendPresence` e `chat/markMessageAsRead`. Falha de presença só loga, nunca derruba o fluxo.
- `_shared/presence.ts` (novo): `startPresenceHeartbeat(adapter, to, state, intervalMs = 4000)` com `stop()` idempotente e duração máxima para não vazar timers.
- `whatsapp-in/index.ts`: inicia o heartbeat `composing` após resolver `replyTo`; troca para `recording` no trecho de síntese antes de `adapter.sendAudio`; `stop()` em `finally`.
- `whatsapp-out/index.ts`: `composing` breve antes de cada `sendText` da fila.

Arquivos:
- `omie-proxy/index.ts`: expandir `classifyAttachment` com os padrões adicionais.
- `ai-assistant/insights.ts`: `list_os_attachments` recebe `kinds?: string[]` e `name_contains?: string`, devolve `arquivos_correspondentes` + `demais_arquivos` e uma `instrucao` que manda entregar direto. `get_os_attachment` aceita `attachment_ids?: number[]` (ou é chamada em sequência) para entregar vários numa volta; melhorar o casamento por nome com normalização sem acento.
- `ai-assistant/index.ts` (prompt do sistema): regra de proatividade — identificar pelo termo pedido, entregar, e só perguntar em ambiguidade real, sempre já tendo executado o que era possível.

Sem mudança de schema e sem novas credenciais.
