# DeskcommCRM como orquestrador da Marina: veredito e aproveitamento

## Veredito da análise

O DeskcommCRM é um CRM open source (MIT) de WhatsApp com uma camada de IA madura — mas **não podemos usá-lo para orquestrar a Marina**. Três bloqueios estruturais:

1. **Runtime incompatível**: o motor deles (`lib/agent-engine`) roda em Node com `pg` direto e workers Next.js via cron. A Marina roda em Deno Edge Function no Lovable Cloud. Importar o código exigiria reescrever toda a camada de banco, filas e cron.
2. **Acoplamento de schema profundo**: tudo depende de dezenas de tabelas deles (`event_log`, `org_memory_*`, `conversations`, `automation_rules`...). Extrair "só o agente" significa recriar o schema inteiro.
3. **Domínio diferente**: eles atendem clientes externos no WhatsApp (multi-agente por organização, anti-banimento, janela de 24h da Meta). A Marina é copiloto interno com ~40 ferramentas sobre os módulos do Arrow.

**O que vale**: a arquitetura deles é uma referência excelente — e vários padrões resolvem dores reais que já enfrentamos com a Marina. A proposta é **portar os padrões, não o código**.

## O que vamos portar (4 padrões)

### 1. Disjuntor de ferramentas (tool circuit breaker)
O padrão mais valioso do repo. Hoje, se uma ferramenta da Marina falha, o modelo pode tentar de novo indefinidamente com os mesmos argumentos. Portar os três modos deles para o laço de tools da Marina:
- **exact_failure**: mesma ferramenta + mesmos argumentos falhando 2x → bloquear e instruir o modelo a mudar de estratégia.
- **same_tool_failure**: mesma ferramenta falhando 3x com argumentos variados → interromper e informar o usuário.
- **idempotent_no_progress**: ferramenta de leitura devolvendo resultado idêntico 2x seguidas → bloquear nova chamada.
Ferramentas de escrita ficam fora do 3º modo por registro explícito.

### 2. Roteador de intenção com subagentes setoriais
Responde à sua pergunta anterior ("a Marina está atuando sozinha?"). Em vez de um prompt gigante com ~40 ferramentas sempre carregadas:
- Um classificador barato (Gemini 2.5 Flash Lite) lê a mensagem e escolhe o módulo: Comercial, Operação, RH, Qualidade, Financeiro ou Geral.
- Cada módulo vira um "subagente": fatia própria de persona + apenas as ferramentas daquele domínio.
- Se a classificação falhar ou a confiança for baixa, cai no agente geral (comportamento atual) — nunca trava.
- Ganho duplo: respostas mais precisas (menos ferramentas para confundir o modelo) e custo de tokens menor.

### 3. Guardrails determinísticos de saída
Eles validam o texto da IA antes de enviar, sem LLM. Dois guardrails úteis para nós:
- **Vazamento de bastidores**: regex determinístico que detecta a Marina citando ferramentas/prompt/sistema ("a ferramenta me instruiu", "meu sistema") e reescreve antes de responder — hoje isso é só instrução de prompt, que o modelo pode ignorar.
- **Promessa comercial**: no módulo Comercial, detectar preço/desconto/parcelamento citados em texto e conferir contra os valores reais vindos das ferramentas (EVA/itens). Se a Marina prometer valor que não veio de consulta, bloquear e corrigir — extensão natural da rede de segurança `ANNOUNCEMENT_RE` que já temos.

### 4. Escalonamento após falhas repetidas
Quando o disjuntor disparar ou a Marina não conseguir concluir um pedido após 2 tentativas: em vez de insistir, ela informa o usuário e oferece criar um ticket de suporte com o contexto da conversa — inspirado no handoff orquestrado deles, adaptado ao nosso fluxo de tickets já existente.

## Preparação para WhatsApp via Evolution API (já mapeado)

Decisões registradas: **público = só colaboradores**; **Evolution API será hospedada em breve** (instância ainda não existe). O desenho abaixo fica pronto nesta leva; quando a instância subir, a conexão é só configurar segredos e apontar o webhook.

### Arquitetura alvo (canal-agnóstica, inspirada no ChannelAdapter deles)

```text
Evolution API ──webhook──> whatsapp-in (Edge Function)
                              │ valida segredo do webhook, ignora fromMe/grupos,
                              │ normaliza para o envelope de mensagem
                              ▼
                     channel_router: telefone → user_id (tabela channel_identities)
                              │ número não vinculado → fluxo de vínculo por código
                              ▼
                     ai-assistant (núcleo canal-agnóstico)
                              │ roda com as permissões do perfil do colaborador
                              ▼
                     whatsapp-out: fila de saída + retry + anti-loop
                              ▼
                     Evolution API (sendText)
```

Pontos-chave do desenho:

- **Envelope normalizado**: toda mensagem (web, voz ou WhatsApp) vira `{ channel, userId, text, externalId?, receivedAt }` antes de chegar na Marina. O núcleo da assistente nunca fala com a Evolution API diretamente — trocar de provedor depois não toca o cérebro.
- **Identidade e segurança**: WhatsApp é canal sem login, então o vínculo é explícito — nova tabela `channel_identities` (canal, telefone, user_id, verificado). Fluxo de vínculo: o colaborador gera um código de 6 dígitos em Configurações da Conta e o envia no primeiro contato pelo WhatsApp; sem vínculo verificado, a Marina responde apenas o convite de vínculo, sem expor nenhum dado.
- **Permissões**: uma vez vinculado, tudo roda com o token/perfil do colaborador (RLS intacto). Escritas destrutivas seguem a confirmação em duas etapas que já existe, adaptada para resposta textual ("CONFIRMO").
- **Anti-loop e higiene**: ignorar mensagens `fromMe`, grupos e broadcasts; deduplicar por ID da mensagem (a Evolution reenvia webhooks); fila de saída com retry limitado.
- **Convivência com o Twilio**: as notificações one-way atuais continuam no Twilio; a Evolution entra como canal **conversacional**. Unificação fica para decisão futura, sem pressa.

### O que se constrói agora vs. quando a instância existir

- **Agora**: envelope + abstração de canal no `ai-assistant`; tabela `channel_identities` com RLS; tela de vínculo em Configurações da Conta; Edge Functions `whatsapp-in` e `whatsapp-out` prontas (retornam "não configurado" sem os segredos); documentação de setup em `docs/`.
- **Quando a Evolution estiver hospedada**: cadastrar os segredos (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `EVOLUTION_WEBHOOK_TOKEN`), apontar o webhook da instância para a URL do `whatsapp-in` e testar ponta a ponta. Nenhum código novo será necessário.
- **Conexão da instância via código, não QR**: a vinculação do número ao WhatsApp será por **código de pareamento** (a Evolution gera o código para o número informado e ele é digitado no WhatsApp em "Conectar com número de telefone"). O passo a passo operacional fica documentado no guia de setup; sem telas de QR no Arrow.

## O que NÃO vamos aproveitar

- Nenhum código copiado literalmente (licença MIT permite, mas o acoplamento inviabiliza).
- A camada MCP deles para despacho de ferramentas (over-engineering para ferramentas que já são nativas).
- WAHA, automações QUANDO/SE/ENTÃO e RAG com pgvector — fora do escopo (podemos revisitá-los se um dia a Marina atender clientes externos).

## Detalhes técnicos

- `supabase/functions/ai-assistant/tools.ts`: registro de ferramentas por módulo (mapa modulo → toolIds) + flag `readOnly` por ferramenta (para o modo idempotent_no_progress).
- `supabase/functions/ai-assistant/index.ts`: disjuntor no laço de `tool_calls`; etapa de classificação de intenção antes da montagem do prompt; guardrails na saída final; oferta de ticket após falhas repetidas; entrada passa a aceitar o envelope de canal (`channel`, `externalId`) sem assumir que a origem é o chat web.
- Novo arquivo `supabase/functions/ai-assistant/guardrails.ts`: vazamento de bastidores + promessa comercial (determinísticos, com testes de mesa nos comentários).
- Novo arquivo `supabase/functions/ai-assistant/router.ts`: classificador de intenção com parse tolerante (JSON malformado vira fallback para o agente geral, nunca erro).
- Novo arquivo `supabase/functions/_shared/channels.ts`: tipos do envelope e interface `ChannelAdapter` (`send`, `capabilities`) — análogo conceitual ao `channel-adapter.ts` deles.
- Novas Edge Functions `whatsapp-in` (webhook: valida `EVOLUTION_WEBHOOK_TOKEN`, deduplica por message id, resolve identidade, chama a Marina, enfileira resposta) e `whatsapp-out` (consome a fila e posta na Evolution; sem segredos configurados responde "não configurado" sem falhar). Ambas registradas em `supabase/config.toml` com `verify_jwt = false` + validação de segredo em código (webhook não carrega JWT de usuário).
- Migração: `channel_identities` (channel, external_id, user_id, verified, verification_code, verified_at) com GRANTs, RLS (dono vê o próprio vínculo; RH/diretor gerenciam) e unicidade de (channel, external_id); `whatsapp_outbox` (message_id único, status, attempts) para a fila de saída idempotente.
- `src/pages/account/AccountSettings.tsx`: seção "Conectar WhatsApp" — gera código de 6 dígitos (expira em 15 min) e mostra instrução de envio; lista vínculos ativos com opção de desvincular.
- `docs/whatsapp-evolution-setup.md`: passo a passo de hospedagem da Evolution (Docker), criação da instância, **conexão do número via código de pareamento (sem QR code)**, cadastro dos 4 segredos e apontamento do webhook.
- Deploy das funções `ai-assistant`, `whatsapp-in` e `whatsapp-out`.

## Validação

- "remova 1" e fluxos já corrigidos continuam funcionando (regressão).
- Ferramenta forçada a falhar 2x com mesmos args → Marina muda de estratégia em vez de repetir.
- Pergunta de RH ("férias do João") → roteada ao subagente de RH com apenas ferramentas de RH no laço.
- Marina provocada a falar de bastidores → resposta sai reescrita, sem citar ferramentas.
- Conferir nos logs da função: classificação, módulo escolhido e disparos do disjuntor.
- Canal: gerar código em Configurações; simular POST no `whatsapp-in` com número não vinculado → resposta de convite ao vínculo; com número vinculado → Marina responde com as permissões do perfil; webhook com segredo errado → 401; mensagem duplicada → processada uma única vez.
