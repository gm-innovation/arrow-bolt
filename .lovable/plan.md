# Arrow como espelho de Omie/Auvo + alertas universais no WhatsApp

## Diagnóstico (confirmado no código)

| Integração | Hoje | Falta |
|---|---|---|
| Omie | Consulta manual de OS, sync de clientes manual, anexo de relatório | Espelho automático de OSs (criação e atualização) |
| Auvo | Espelho de auditoria (tabelas `auvo_*`) disparado manualmente | Agendamento automático + reconciliação com `service_orders` |
| Marina | Já lê Auvo e OSs; WhatsApp já roteia para ela | Ler dados do Omie; regra de acesso por papel (diretor/super admin/coordenador) |
| Alertas WhatsApp | Infra pronta (notify-dispatch + preferências + fila), leads já disparam | Cobertura universal (muitos avisos não passam pelo dispatcher); WhatsApp desligado por padrão |

Importante: Omie e Auvo não oferecem webhooks confiáveis para "OS criada/atualizada" — o espelho será por **sincronização agendada** (polling incremental a cada poucos minutos), que na prática entrega o mesmo resultado.

## Etapa 1 — Espelho Omie → Arrow (criação + atualização de OS)

- Nova edge function `omie-sync` (modo `sync_orders`): lista as OSs do Omie por empresa com credenciais ativas, em janelas incrementais (desde a última sincronização) com paginação.
- Migration: adicionar em `service_orders` as colunas `omie_os_id` (número interno da OS no Omie) e `external_source` (`omie`/`auvo`/`manual`), com índice único por empresa.
- Para cada OS do Omie: localizar a OS Arrow pelo `omie_os_id` (ou pelo número da OS) e **atualizar** cliente, embarcação, status, datas e descrição; se não existir, **criar** a OS espelho (cliente resolvido via `omie_client_id` já sincronizado).
- Registrar cada execução em log (quantas criadas/atualizadas/ignoradas, erros) reaproveitando o padrão de `auvo_sync_runs`.
- Agendamento via pg_cron a cada 15 minutos.
- Escopo: espelho de leitura (Omie → Arrow). O que o Arrow já envia ao Omie (anexo de relatório) continua como está.

## Etapa 2 — Espelho Auvo → Arrow contínuo

- Agendar via pg_cron a execução automática do `auvo-sync` (modo sync) em intervalo curto (horário), hoje é só manual.
- Reconciliação: quando o espelho Auvo de uma OS mudar (ex.: checkout/finalização), atualizar a `service_orders` correspondente (status, datas) usando o vínculo por número de OS já existente.
- Manter a auditoria de materiais funcionando como está.

## Etapa 3 — Marina com acesso às integrações (chat + WhatsApp)

- Nova ferramenta `query_omie_orders` (leitura do espelho Omie em `service_orders` + status da última sincronização).
- Regra de acesso nas ferramentas de integração: `director`, `super_admin` e `coordinator` consultam livremente; demais papéis recebem recusa educada (sem dados).
- Como o WhatsApp já roteia para a `ai-assistant`, as mesmas ferramentas passam a valer nos dois canais automaticamente. Validar de ponta a ponta com uma conversa real no WhatsApp.

## Etapa 4 — Alertas universais no WhatsApp

- **Trigger em `notifications`**: todo aviso gravado no sistema (qualquer tipo, qualquer origem) dispara via pg_net a função `notify-whatsapp-mirror`, que respeita as preferências do usuário (canal WhatsApp ligado/desligado, tipos silenciados, horário silencioso) e enfileira na `whatsapp_outbox`. Isso cobre solicitações internas (RH, suprimentos, qualidade etc.) e todos os demais tipos sem precisar alterar cada módulo.
- **Ativação automática**: quando um colaborador vincula o WhatsApp (identidade por telefone), preencher automaticamente `whatsapp_phone` e ligar `whatsapp_enabled` nas preferências — hoje o canal nasce desligado e vazio.
- **Lead novo**: `public-lead-intake` já dispara notificação; garantir que o time comercial receba também no WhatsApp (destinatários com papel `commercial`/`marketing` da empresa).
- A área de preferências por colaborador **já existe** (Configurações > Notificações, com canais, tipos silenciados e horário silencioso) — nesta etapa ela passa a valer de fato para o WhatsApp. Numa etapa futura podemos evoluir a tela (ex.: escolher receber só no WhatsApp, por tipo).

## Ordem de execução

1. Etapa 4 (alertas) — entrega valor imediato com a infra que já existe.
2. Etapa 1 (espelho Omie) — migration + função + cron.
3. Etapa 2 (espelho Auvo contínuo) — cron + reconciliação.
4. Etapa 3 (Marina) — ferramenta + gating + validação no WhatsApp.

## Notas técnicas

- Cron via `pg_cron` + `net.http_post` (padrão já usado nas migrations do projeto), chamando as edge functions com a chave de serviço.
- Sync incremental com marca d'água por empresa (última data de alteração processada) para não varrer o Omie inteiro a cada execução; janela de segurança de alguns minutos para não perder atualizações em corridas.
- Idempotência: upsert por `omie_os_id`/número da OS; nunca duplicar OS já importada manualmente (reconciliar o vínculo nesses casos).
- Tabelas novas/alteradas seguem a regra da casa: GRANT + RLS + policies.
- Falhas de API (rate limit do Omie/Auvo) viram log com backoff, sem derrubar a fila.
- RLS: espelhos continuam segmentados por `company_id`; a Marina só enxerga dados da empresa do usuário.
