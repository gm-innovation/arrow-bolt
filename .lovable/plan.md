# Hermes Agent como cérebro externo da Marina

Objetivo: a Marina continua sendo a dona dos dados do Arrow (nenhum acesso direto do Hermes ao banco), e passa a ter um especialista externo — o Hermes na sua VPS — para tudo que exige internet e ferramentas de fora. Um roteador decide, por tarefa, quem responde.

## O que já foi verificado

- O endpoint responde: `POST http://187.127.60.250:8642/v1/chat/completions` devolveu `401 gateway_auth_error` sem chave, ou seja, está no ar e é compatível com o formato OpenAI.
- A Marina já tem um despachante de modelos único (`supabase/functions/_shared/llm.ts`) com os provedores `lovable`, `openrouter` e `openai`, além de fallback automático. É exatamente o ponto onde o Hermes entra, sem reescrever a agente.
- O roteador da Marina (`router.ts`) já classifica domínio e planeja tarefas, e os especialistas já rodam em paralelo (`specialists.ts`). O Hermes vira um novo especialista nessa estrutura.

## Como vai funcionar

1. **Novo provedor `hermes`.** A chave e a URL ficam como segredos do backend (`HERMES_API_KEY`, `HERMES_BASE_URL`). Nada de chave no frontend, nada de IP fixo no código.
2. **Roteamento por tarefa.**
   - Pedido sobre dados internos (OS, agenda, RH, financeiro, qualidade, Omie/Auvo/EVA) → Marina, como hoje.
   - Pedido que precisa de internet, pesquisa, sites, documentos públicos, notícias, cotações, ferramentas externas → tarefa delegada ao Hermes.
   - Pedido misto ("compare o preço do fornecedor X com a nossa última compra") → a Marina busca o dado interno, manda **apenas o contexto necessário** ao Hermes, e junta as duas respostas em uma voz só.
3. **Contexto sem dados sensíveis.** O Hermes recebe a pergunta e um resumo curto (papel do usuário, empresa, e os números que a Marina já apurou). Nunca recebe token do usuário, nem PII de RH, nem UUIDs — a mesma regra de redação que os guardrails já aplicam.
4. **Transparência.** Quando a resposta veio do Hermes, isso é citado como fonte ("consultado na internet via Hermes, agora"), no mesmo padrão de "no Arrow agora" / "segundo o Omie às 09:12".
5. **Degradação segura.** Se o Hermes estiver fora, lento ou sem crédito, a tarefa externa falha em silêncio e a Marina responde com o que tem, dizendo o que não conseguiu consultar. O contrário também vale: cair para o Lovable AI quando o Hermes não responder.
6. **Painel de controle.** Em `/super-admin/ai-management`, o Hermes aparece como provedor selecionável, com teste de conexão ("pingar o Hermes"), latência da última chamada e um interruptor para ligar/desligar a delegação externa por empresa.

## Onde isso aparece para o colaborador

Chat interno e WhatsApp — sem mudança de interface. A diferença é que perguntas que hoje morrem em "não tenho acesso a isso" passam a ser respondidas, com a fonte declarada.

## Detalhes técnicos

- `_shared/llm.ts`: `LLMProvider` ganha `"hermes"`; branch lê `HERMES_BASE_URL` (default do valor informado) + `HERMES_API_KEY`, monta `Authorization: Bearer`, modelo `hermes-agent`, `stream: false`. Fallback para `lovable` mantido nos status 5xx/401/429. Sem `AbortSignal.timeout` agressivo: teto próprio de ~90s por chamada, com falha tratada.
- `router.ts`: `planTasks` passa a poder emitir tarefa do tipo `externo`. Novo `DOMAIN_PERSONA.externo` e módulo correspondente; classificação por sinais explícitos (pesquisar/na internet/site/notícia/cotação/norma pública) e por ausência de entidade interna capaz de responder.
- `specialists.ts`: `runSpecialist` aceita provedor por especialista, e o especialista `externo` roda no Hermes sem nenhuma ferramenta de banco — retorno normalizado `{ achados, fontes, faltou }` como os demais.
- Nova ferramenta de leitura `ask_hermes(objetivo, contexto_resumido)` disponível ao orquestrador para chamadas pontuais, registrada em `READONLY_TOOLS` e nunca no catálogo de escrita.
- `guardrails.ts`: a saída do Hermes passa pelo mesmo scrub (sem UUID, sem nome de ferramenta, sem bastidores) e pela trava anti-especulação; conteúdo externo é marcado como externo antes de entrar na resposta.
- Observabilidade: cada delegação registrada em `ai_assistant_actions` (provedor, objetivo, ms, sucesso) para medir custo e latência.
- Segredos: `HERMES_API_KEY` e `HERMES_BASE_URL` via segredos do backend. Recomendação: colocar o Hermes atrás de HTTPS com domínio próprio — hoje é HTTP em IP puro, então a chave e o conteúdo viajam sem criptografia entre a Edge Function e a VPS.
- Deploy: `ai-assistant` redeployada e validada com "pesquise na internet o preço atual do dólar", "quais OSs estão em atraso" (deve continuar interna) e um pedido misto para conferir a junção das duas fontes.
