# Marina: acesso completo ao sistema por role

## Problema

A Marina respondeu que "não tem informações sobre leads ou oportunidades" porque o edge function `ai-assistant` foi construído de forma estreita:

1. O `buildCoordinatorSystemPrompt()` declara que ela é uma assistente apenas de "coordenação de serviços técnicos navais" (OS, técnicos, disponibilidade).
2. Os "intents" detectados por regex cobrem apenas disponibilidade de técnicos, status de OS e produtividade. Nada de CRM, comercial, financeiro, RH, compras, qualidade, frota, etc.
3. Não há ferramentas (tool calling) que permitam o modelo buscar dados sob demanda.
4. O prompt ainda usa o nome fixo "NavalOS AI" em vez do nome/personalidade do agente cadastrado (Marina).

Resultado: mesmo com o coordenador tendo acesso operacional ao CRM (Leads, Oportunidades, Vendas), a Marina simplesmente nega o assunto.

## Objetivo

Marina deve poder responder sobre qualquer módulo que o usuário logado tem permissão de ver, com dados reais do banco filtrados pelo `company_id` e pelo `role`.

## Mudanças propostas

### 1. Prompt baseado na identidade do agente (não mais hardcoded "NavalOS AI")

Em `supabase/functions/ai-assistant/index.ts`:

- Buscar o agente (por `agentId` enviado ou `is_default = true` global) e ler `name`, `identity`, `personality`, `capabilities`.
- Montar o system prompt usando esses campos. O texto "Você é a Marina, …" passa a vir da configuração do super admin.
- Manter um trecho fixo com regras de comportamento (responder em pt-BR, usar markdown, ser proativa, não pedir info já no contexto).

### 2. Mapa de capacidades por role

Adicionar no edge function um catálogo de "o que cada role pode consultar":

```text
technician   → minhas tarefas, minhas OS, meus relatórios, base de conhecimento, equipamentos
coordinator  → tudo de técnico + OS da empresa, técnicos/disponibilidade,
                clientes, embarcações, CRM (leads, oportunidades, vendas,
                produtos, recorrências), medições, compras (visão), qualidade (visão)
manager/director → tudo de coordinator + métricas consolidadas, financeiro,
                   RH (técnicos, ausências, ponto), aprovações
hr           → colaboradores, ausências, ponto, recrutamento, onboarding, universidade
commercial   → CRM completo (leads, oportunidades, clientes, vendas, contatos)
compras      → solicitações de compra, fornecedores, estoque
financeiro   → a pagar, a receber, reembolsos, categorias
qualidade    → NCRs, auditorias, planos de ação
super_admin  → tudo, multi-empresa
```

Esse mapa decide quais ferramentas o modelo recebe em cada chamada.

### 3. Tool calling (função sob demanda)

Em vez de detectar intent por regex e pré-carregar dados, registrar um conjunto de ferramentas (`tools`) que o modelo pode chamar quando precisar. Cobertura inicial:

- `query_service_orders` (filtros: status, período, cliente, embarcação, técnico)
- `query_technician_availability` (data alvo)
- `query_technician_productivity` (período)
- `query_clients` (busca por nome/CNPJ)
- `query_vessels` (busca, posição AIS)
- `query_crm_leads` (status, responsável, período)
- `query_crm_opportunities` (estágio, cliente, valor, responsável)
- `query_crm_sales` (período, cliente, status)
- `query_crm_products` (busca, categoria)
- `query_crm_recurrences` (cliente, próximos vencimentos)
- `query_purchase_requests` (status, departamento)
- `query_finance_payables` / `query_finance_receivables` (status, período)
- `query_hr_employees` / `query_hr_absences` (período, tipo)
- `query_quality_ncrs` / `query_quality_audits`
- `query_corp_requests` (tipo, status)
- `search_knowledge_base` (busca semântica em `ai_knowledge_chunks` + `crm_knowledge_base`)

Cada ferramenta executa SELECTs com `service_role`, aplicando sempre `company_id = context.companyId` e checando o mapa de capacidades acima antes de responder. Se o role não tem permissão, a ferramenta retorna `{ denied: true, reason: "..." }` e o modelo explica isso ao usuário.

Loop padrão de tool calling: chamar o modelo → se vier `tool_calls`, executar e devolver `role: tool` no histórico → chamar de novo → repetir até resposta final (máx. 5 iterações).

### 4. Reescrita dos system prompts

- Remover "minha função se restringe a coordenação de serviços técnicos navais".
- Substituir por: "Você é {agentName}. Você tem acesso aos seguintes módulos para este usuário ({role}): …lista do mapa…. Use as ferramentas disponíveis para consultar dados reais antes de dizer que não sabe."
- Regra explícita: "Nunca diga que não tem informação sem antes tentar uma ferramenta apropriada."

### 5. Compatibilidade

- Manter o fluxo atual de `generate_report_fields` para técnicos (não regride a geração de relatório).
- Manter streaming quando não há tool calls pendentes; quando há, alternar para não-stream durante o loop e voltar a stream na resposta final (ou retornar JSON final, como já faz hoje no caminho `useTools`).
- Limitar resultados de cada ferramenta (ex.: `limit 50`) e truncar campos longos para não estourar contexto.

## Detalhes técnicos

Arquivos afetados:

- `supabase/functions/ai-assistant/index.ts` — refatoração principal: carregar identidade do agente, montar tools por role, implementar loop de tool calling, novos prompts.
- (Opcional) extrair as ferramentas para `supabase/functions/ai-assistant/tools.ts` para manter `index.ts` legível.

Sem mudanças de schema. Sem novas migrações. Sem mudanças no frontend (`AIAssistant.tsx` / `AIChat.tsx` continuam enviando `userRole`, `agentId`, `context.companyId`).

Roles mapeados conforme `getRoleName()` em `AIAssistant.tsx`: hoje só envia `technician`, `admin`, `manager`. Vou expandir esse helper para enviar também `hr`, `commercial`, `compras`, `financeiro`, `qualidade`, `director`, `super_admin` — assim o edge function consegue aplicar o mapa de capacidades correto para cada perfil.

## Resultado esperado

Coordenador pergunta "quais leads abertos esta semana?" → Marina chama `query_crm_leads({ status: 'open', period: 'this_week' })` → responde com a lista.

Coordenador pergunta sobre OS, técnicos, clientes, embarcações, vendas, produtos, recorrências, compras (visão) → todas funcionam.

Técnico pergunta sobre vendas → Marina explica educadamente que esse módulo não está no seu perfil de acesso.
