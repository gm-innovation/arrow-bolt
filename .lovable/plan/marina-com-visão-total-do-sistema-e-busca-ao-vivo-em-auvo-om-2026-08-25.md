# Marina com visão total do sistema (e busca ao vivo em Auvo, Omie e EVA)

## O que está faltando hoje (verificado)

- **Contagens erradas.** As consultas da Marina retornam no máximo 50 linhas e o "count" é só o número de linhas trazidas. Se um diretor perguntar "quantas OSs estão em aberto", ela responde no máximo 50, nunca o total real (hoje são milhares de OSs espelhadas).
- **Disponibilidade de técnico não existe como ferramenta.** A Marina só lista técnicos ativos com especialidade e telefone. O sistema já tem a regra de disponibilidade usada nas telas (férias, ausências, reservas, OSs do dia) e os check-in/check-out do Auvo, mas nada disso chega até ela.
- **Faturamento não está no banco.** A etapa da OS no Omie (10 em aberto, 30 aguardando faturamento, 50 faturada, 60 concluída) é convertida para o status simplificado do Arrow e a etapa original é descartada. Então "essa OS já foi faturada?" é impossível de responder: "concluída" hoje mistura faturada com concluída.
- **Sem busca ao vivo.** Auvo e Omie só são lidos pelos espelhos (sincronizados periodicamente). Se o registro ainda não sincronizou, a Marina diz que não existe. O EVA já é consultado ao vivo (produtos) — é o modelo a seguir.

## O que vou fazer

### 1. Números certos: contagens e resumos
- Toda consulta passa a trazer o **total real** de registros que atendem ao filtro, separado da amostra que ela exibe.
- Nova ferramenta de **painel operacional**: totais de OSs por status (em aberto, em execução, aguardando faturamento, faturadas, concluídas, canceladas), quantas atrasadas, quantas sem técnico, quantas do mês — em uma única resposta.
- Resumos equivalentes para o financeiro (a pagar/receber vencidos e a vencer), comercial (funil por estágio) e compras (requisições pendentes), respeitando o papel de quem pergunta.

### 2. Técnicos: disponível, em atendimento, de férias
- Nova ferramenta de **situação da equipe**: para hoje (ou uma data informada), cada técnico com um estado claro — disponível, em atendimento (com a OS/cliente do check-in aberto no Auvo), alocado em OS do dia, de férias, ausente ou reservado — usando exatamente a mesma regra das telas de agenda.
- Perguntas como "quem está livre amanhã?" ou "quem está em campo agora?" passam a ter resposta direta, com nome, especialidade e o que está bloqueando.

### 3. Faturamento da OS
- Passo a guardar a **etapa original do Omie** na OS (além do status atual), preenchendo o histórico já sincronizado e as próximas sincronizações.
- A Marina passa a responder o estado de faturamento em português ("aguardando faturamento", "faturada em ...") e, quando a OS não estiver no espelho ou a etapa estiver desatualizada, **consulta o Omie ao vivo** pelo número da OS.

### 4. Busca ao vivo quando não está no sistema
- **Omie ao vivo**: consulta de OS por número/código, trazendo etapa, cliente, valor e datas direto do ERP.
- **Auvo ao vivo**: busca de tarefas de campo por número de OS, técnico, cliente ou período, incluindo check-in/check-out e relato, para quando a tarefa ainda não sincronizou.
- **EVA**: mantém a consulta ao vivo de produtos que já existe, mais consulta de saídas/materiais por OS.
- Regra de comportamento: primeiro o sistema; se não achar, ela avisa que vai buscar na origem, busca e informa a fonte ("segundo o Omie agora"). Nunca inventar dado e nunca dizer "não existe" antes de tentar a origem.

### 5. Cobertura para diretoria e coordenação
- Revisão do mapa de permissões da Marina para que diretor, super admin e coordenador alcancem tudo que já veem nas telas — incluindo o que hoje está fora do alcance deles na conversa (medições, RH, qualidade, financeiro conforme o papel).
- Cada resposta continua limitada ao que o perfil pode ver; quando não pode, ela diz claramente em vez de tentar contornar.

## Detalhes técnicos

- `supabase/functions/ai-assistant/tools.ts`: `basicQueryTool` passa a usar `count: "exact", head: false` e devolver `total` + `sample`; novas ferramentas `get_operations_dashboard`, `get_team_status` (via `get_technician_availability_v2` + `auvo_tasks` com `checkin_at` sem `checkout_at`), `query_omie_live` (invoca `omie-proxy` com `action: "consult_order"`), `query_auvo_live` (login + `fetchAuvoTasks` de `auvo-sync/auvo.ts`, extraído para `_shared/`), `get_os_billing_status`. Todas registradas em `READONLY_TOOLS`.
- Migração: coluna `omie_etapa` (text) em `service_orders` + backfill a partir de nova leitura do Omie; `omie-sync/index.ts` passa a persistir `cEtapa` junto do status mapeado.
- `ai-assistant/index.ts`: bloco de prompt com a cascata espelho → origem ao vivo, obrigação de citar a fonte e de nunca declarar inexistência sem consultar Auvo/Omie/EVA; inclusão das novas ferramentas nos módulos de `director`, `super_admin` e `coordinator`.
- `ROLE_MODULES`: revisão de cobertura por papel; nenhuma mudança de RLS — as leituras continuam filtradas por `company_id` e as escritas seguem pelo token do usuário.
- Deploy de `ai-assistant` e `omie-sync`, e teste das perguntas: "quantas OSs em aberto", "quem está disponível hoje", "a OS 5539 já foi faturada".
