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

## O que NÃO vamos aproveitar

- Nenhum código copiado literalmente (licença MIT permite, mas o acoplamento inviabiliza).
- A camada MCP deles para despacho de ferramentas (over-engineering para ferramentas que já são nativas).
- WhatsApp/WAHA, automações QUANDO/SE/ENTÃO e RAG com pgvector — fora do escopo desta demanda (podemos revisitá-los se um dia a Marina atender clientes externos).

## Detalhes técnicos

- `supabase/functions/ai-assistant/tools.ts`: registro de ferramentas por módulo (mapa modulo → toolIds) + flag `readOnly` por ferramenta (para o modo idempotent_no_progress).
- `supabase/functions/ai-assistant/index.ts`: disjuntor no laço de `tool_calls`; etapa de classificação de intenção antes da montagem do prompt; guardrails na saída final; oferta de ticket após falhas repetidas.
- Novo arquivo `supabase/functions/ai-assistant/guardrails.ts`: vazamento de bastidores + promessa comercial (determinísticos, com testes de mesa nos comentários).
- Novo arquivo `supabase/functions/ai-assistant/router.ts`: classificador de intenção com parse tolerante (JSON malformado vira fallback para o agente geral, nunca erro).
- Sem migração de banco nesta etapa; sem mudança de RLS; voz e canais atuais inalterados.

## Validação

- "remova 1" e fluxos já corrigidos continuam funcionando (regressão).
- Ferramenta forçada a falhar 2x com mesmos args → Marina muda de estratégia em vez de repetir.
- Pergunta de RH ("férias do João") → roteada ao subagente de RH com apenas ferramentas de RH no laço.
- Marina provocada a falar de bastidores → resposta sai reescrita, sem citar ferramentas.
- Conferir nos logs da função: classificação, módulo escolhido e disparos do disjuntor.
