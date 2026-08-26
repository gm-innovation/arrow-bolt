# Marina como equipe de agentes: orquestrador + especialistas

## Onde estamos hoje (verificado no código)

- O que existe não é uma equipe: é **um agente só trocando de roupa**. O roteador (`router.ts`) classifica a mensagem em um domínio e apenas troca a persona e reduz o catálogo de ferramentas do mesmo agente. Um pedido que cruza dois setores cai em "geral" e não restringe nada.
- Já existe um embrião de trabalho paralelo: `memory.ts` dispara "buscadores" simultâneos (comercial, clientes, operação, RH, qualidade, suprimentos, histórico) com 3,5s de limite — mas eles só rodam quando a mensagem é ambígua, cada um executa uma consulta fixa e não raciocinam.
- O alcance é o gargalo real. Existem ~60 ferramentas escritas à mão para um banco com mais de 300 tabelas. Na sua última conversa você perguntou o que era a notificação "Conta a receber vencida — [QA] Cliente Recebivel — R$ 980,25 — 25/08/2026": ela chutou ("**provavelmente** o QA estava testando") e desistiu. Eu achei em dois comandos — é uma conta a receber real de R$ 980,25 vencendo 25/08/2026, da Lecsor Technology, criada em 05/08, e o "[QA]" vem do cliente de teste. Ela falhou porque **não existe ferramenta de notificações**, a busca em contas a receber só olha a descrição (vazia nessa conta) e não há "abrir este registro".

Ou seja: fracionar em vários agentes é o caminho certo, mas sozinho não resolve — cada especialista precisa de alcance genérico, senão teremos seis agentes cegos em vez de um.

## Arquitetura proposta

```text
        você (chat interno / WhatsApp / voz)
                     |
              ORQUESTRADOR
   entende o pedido, quebra em tarefas, delega,
   cobra resultado, junta e responde com fonte
        |        |        |        |        |
   Operação  Comercial  RH/DP  Qualidade  Financeiro
   Suprimentos   Integrações(Omie/Auvo/EVA)   Conhecimento/Histórico
        \________________|________________/
                 camada de acesso comum
        (catálogo do sistema + consulta universal,
         sempre com as permissões do SEU usuário)
```

### 1. Orquestrador
Recebe o pedido, decide se resolve direto (pergunta simples) ou monta um plano de tarefas. Delega em paralelo, com orçamento de tempo e de passos por especialista, cobra o que faltou, junta as respostas e fala com você em uma voz só. É o único que conversa com você e o único que confirma escrita.

### 2. Especialistas por setor
Operação (OSs, técnicos, agenda, medições), Comercial (leads, oportunidades, vendas, produtos), RH/DP (colaboradores, férias, ponto, documentos), Qualidade (NCRs, auditorias, documentos controlados), Financeiro (a pagar/receber, reembolsos), Suprimentos (requisições, estoque). Cada um tem persona, escopo de dados, ferramentas e limites próprios — e responde em formato padronizado: achados, números com total real, fontes e o que não conseguiu.

### 3. Especialistas por tipo de tarefa
- **Integrações**: consulta ao vivo em Omie, Auvo e EVA quando o espelho não tem ou está velho, e dispara sincronização quando necessário.
- **Investigador**: recebe "o que é isso?" e persegue a cadeia — notificação → registro apontado → cliente → OS → origem externa — até fechar o caso.
- **Memória/Histórico**: o que já foi combinado com você, conversas anteriores, preferências.
- **Escrita**: único autorizado a gravar, e só nas ações já homologadas, com confirmação e verificação depois de gravar.

### 4. A camada de acesso que todos compartilham
Aqui está a virada de alcance: em vez de mais ferramentas avulsas, um **catálogo do sistema** gerado do próprio banco (entidades, campos, ligações, rótulos em português) e uma **consulta universal** — entidade, filtros, período, busca, ordenação, contagem real, relacionamentos resolvidos em nome legível. Somente leitura, sempre com o seu token: o que você não pode ver, nenhum agente vê. Isso cobre notificações, contas, OSs, chamados, documentos, RH, qualidade — inclusive tabelas que ainda vamos criar, sem eu programar ferramenta nova.

Mais duas capacidades comuns: **abrir um registro** por id/número (ficha + vínculos + quem criou e quando) e **explicar uma notificação** (resolvendo o registro de origem). Dado marcado como teste ("[QA]") é apresentado como teste, não vira teoria.

### 5. Disciplina de resposta
- Proibido supor: se a resposta tiver palpite ("provavelmente", "deve ser") sobre dado do sistema sem nenhuma consulta no turno, ela é descartada e o agente consulta antes de falar.
- Toda afirmação de dado vem com fonte e data ("no Arrow agora", "segundo o Omie às 09:12").
- Chegou ao fim sem achar: diz o que procurou, onde, e o que falta — nunca "sinto muito" seco.
- Fim das respostas cortadas: hoje o filtro de saída apaga frases inteiras em silêncio (várias respostas dessa conversa começam em linha vazia). Passa a pedir reescrita antes de publicar.

### 6. Autonomia futura (integrar mais ferramentas)
Registro de conectores externos — REST ou servidores MCP de terceiros — com endpoint, credencial em segredo, ações e papéis permitidos. O orquestrador descobre em tempo de execução e passa a ter um novo especialista sem eu reprogramar: ligar ferramenta nova vira cadastro. Nesta etapa entrego o registro e a descoberta.

### 7. Custo e latência sob controle
Especialistas usam modelo rápido e barato; o orquestrador usa modelo forte só para planejar e redigir. Só são acionados os especialistas relevantes ao pedido; cada um tem teto de passos e de tempo, e falha em silêncio sem travar a resposta. Nada de disparar seis agentes para um "bom dia".

## Ordem de entrega

1. Camada de acesso comum (catálogo + consulta universal + abrir registro/explicar notificação) — resolve hoje a dor que você viu.
2. Orquestrador de verdade, com delegação paralela e formato padronizado de retorno.
3. Especialistas por setor migrados para cima dessa camada, mais Investigador e Integrações.
4. Trava anti-suposição, citação de fonte e fim das respostas cortadas.
5. Registro de conectores externos (REST/MCP) e descoberta em tempo de execução.

## Detalhes técnicos

- **Camada comum** (`supabase/functions/ai-assistant/catalog.ts` + `entity-query.ts`): função de banco somente leitura (`SECURITY DEFINER`, sem dados) que lista tabelas/colunas/FKs de `public`, mais metadados curados (rótulo pt-BR, campos exibíveis, campo de data, sensibilidade). Ferramenta `query_entity` construída sobre PostgREST **com o token do usuário** (RLS é a única fronteira), sem SQL vindo do modelo — só nomes validados contra o catálogo — e `count: "exact"` para total real. `get_record` e `explain_notification` (resolve `notifications.reference_id` + `notification_type`). Entidades sensíveis (PII de RH, `profiles`) só via RPCs existentes (`get_employee_pii`, `profiles_public`). Todas em `READONLY_TOOLS`; novo módulo `notifications` em `ROLE_MODULES`.
- **Orquestrador**: `ai-assistant/index.ts` deixa de ser "um agente com catálogo filtrado". `router.ts` evolui de classificador para **planejador**: devolve lista de tarefas `{ especialista, objetivo, entidades }`. Novo `agents/` com `runSpecialist()` — loop próprio de tool-calling (`google/gemini-2.5-flash-lite` por padrão), catálogo restrito ao módulo do especialista mais a camada comum, teto de passos e `AbortSignal` por tempo, retorno normalizado `{ achados, totais, fontes, faltou }`. Execução em `Promise.allSettled`, cada falha degradando em silêncio (padrão já usado em `gatherContextBundle`). O orquestrador nunca recebe linhas cruas em excesso — só o resumo normalizado.
- **Escrita**: ferramentas mutantes ficam fora do catálogo dos especialistas; continuam exclusivas do turno principal com a confirmação determinística e as travas de `guardrails.ts` (anúncio sem execução, confirmação no passado) intactas.
- **Guardrails** (`guardrails.ts`): `SPECULATION_PATTERNS` + sinal `readToolExecuted` → issue `speculation_without_read` com retentativa determinística; quando houver `offendingSentences`, pedir reescrita ao modelo antes de aplicar `rewriteOutput`; afinar `BACKSTAGE_PATTERNS` para não apagar explicação legítima de processo — conferindo antes nos logs da função quais regras cortaram as frases dessa conversa.
- **Conectores**: tabela `ai_external_connectors` (nome, tipo `rest`/`mcp`, base_url, nome do segredo, ações, papéis, `company_id`) com `GRANT`, RLS habilitado e leitura só para `director`/`super_admin`; credenciais sempre em segredos do backend. Descoberta em runtime e chamada via proxy, no padrão de `omie-proxy`.
- **Observabilidade**: cada execução de especialista registrada em `ai_assistant_actions` (agente, objetivo, ferramentas usadas, ms, sucesso) para dar para medir custo e latência depois.
- **Deploy e teste**: `ai-assistant` redeployada e validada com "o que é essa notificação [QA] de conta a receber vencida", "quem criou e quando", "quantas contas a receber estão vencidas", "quem está disponível amanhã e quais OSs estão sem técnico" (pedido cruzando dois especialistas).
