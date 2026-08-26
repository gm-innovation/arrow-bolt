# Marina agêntica: acesso a tudo, com prova de origem

## Por que hoje ela não é isso

Reli sua última conversa (a última mensagem de hoje 09:00 BRT) e o problema não foi falta de esperteza — foi falta de alcance:

- Você perguntou o que era a notificação "Conta a receber vencida — [QA] Cliente Recebivel — R$ 980,25 — 25/08/2026". Ela chutou ("**provavelmente** o QA estava testando...") e depois desistiu ("sinto muito não poder te dar o detalhe").
- Eu achei em dois comandos: é uma notificação do tipo conta vencida apontando para uma conta a receber real de R$ 980,25 com vencimento 25/08/2026, da Lecsor Technology, criada em 05/08 pela conta do Alexandre Silva; o rótulo "[QA]" vem do **cliente de teste**, não da conta.
- Ela não conseguiu porque **cada assunto do sistema precisa de uma ferramenta escrita à mão** e hoje existem cerca de 60 dessas ferramentas para um banco com mais de 300 tabelas. Notificações não têm ferramenta. Contas a receber têm, mas a busca só olha a descrição (que nessa conta está vazia) e não devolve cliente nem quem criou. Não existe "abrir este registro por id".

Enquanto a arquitetura for "uma ferramenta por pergunta", sempre vai faltar. O que você quer é o contrário: **acesso genérico ao sistema todo**, com as permissões do seu usuário.

## A virada: leitura universal em vez de ferramentas avulsas

### 1. Ela passa a conhecer o sistema inteiro
Um catálogo de dados vivo: quais entidades existem, o que cada uma significa em português, quais campos, como se ligam entre si e quem pode ver. Gerado a partir do próprio banco, não escrito à mão — quando criarmos uma tabela nova, ela já sabe da existência no dia seguinte sem eu programar ferramenta.

### 2. Uma única ferramenta de consulta, para qualquer entidade
Em vez de 60 consultas fixas, uma consulta universal: entidade, filtros, período, busca textual, ordenação, contagem real e relacionamentos resolvidos em nome legível (cliente, embarcação, autor, responsável, empresa). Somente leitura, sempre com o **seu** token — o que você não pode ver, ela não vê. Isso cobre notificações, contas, OSs, chamados, medições, documentos, qualidade, RH, tudo.

### 3. "O que é isso aqui?" com rastro completo
Ferramenta de abrir um registro por id, número ou rótulo, devolvendo a ficha, os registros vinculados (a notificação que gerou, a OS de origem, os itens, os anexos), quem criou, quando e o que mudou. Dado marcado como teste (prefixo "[QA]") é identificado como teste, não interpretado como teoria.

### 4. Ela investiga em vários passos antes de responder
Quando a pergunta não se resolve em uma consulta, ela encadeia: notificação → registro apontado → cliente → OS → origem externa (Omie, Auvo, EVA), com orçamento de passos e tempo. Cada resposta cita a fonte e a data do dado.

### 5. Proibido supor
Se a resposta contiver palpite ("provavelmente", "deve ser", "imagino") sobre dado do sistema e nenhuma consulta tiver sido feita no turno, a resposta é descartada e ela consulta antes de falar. Se realmente não existir, ela diz o que procurou, onde, e o que falta — nunca um "sinto muito" seco.

### 6. Parar de entregar resposta cortada
Várias respostas dessa conversa chegaram começando em linha vazia: o filtro de saída apaga frases inteiras em silêncio. Passa a pedir reescrita antes de publicar, e o filtro deixa de derrubar explicação legítima de processo quando você, como administrador, pede detalhe técnico.

### 7. Base para autonomia futura (integrações)
Preparar o caminho já usado pelo EVA/Omie/Auvo para virar padrão: um registro de conectores externos (endpoint, credencial em segredo, ações permitidas por papel) que a Marina descobre em tempo de execução — inclusive servidores MCP de terceiros. Assim, ligar uma nova ferramenta passa a ser cadastro, não reprogramação. Nesta etapa entrego o registro e a descoberta; ligar cada ferramenta nova é um passo curto depois.

### 8. Escrita continua sob trava
Autonomia total na leitura; na escrita, nada muda: continua restrita às ações já homologadas, com confirmação e verificação pós-gravação. Nenhuma consulta universal grava nada.

## Ordem de entrega

1. Catálogo de dados + consulta universal + abrir registro (resolve a dor de hoje e todas as parecidas).
2. Trava anti-suposição e fim das respostas cortadas.
3. Investigação multi-passo com citação de fonte.
4. Registro de conectores externos e descoberta em tempo de execução.

## Detalhes técnicos

- **Catálogo**: função somente leitura no banco (`SECURITY DEFINER`, sem dados) que lista tabelas/colunas/chaves estrangeiras do schema `public`, mais um arquivo de metadados em `supabase/functions/ai-assistant/catalog.ts` com rótulo pt-BR, campos exibíveis, campo de data padrão e sensibilidade por entidade. Entidades sensíveis (PII de RH, `hr_sensitive_data_audit`, `profiles`) marcadas como restritas e acessíveis só pelas RPCs já existentes (`get_employee_pii`, `profiles_public`).
- **Consulta universal**: nova ferramenta `query_entity` em `tools.ts` (args: `entity`, `filters` tipados, `search`, `date_from/date_to`, `order_by`, `limit`) construída sobre PostgREST **com o token do usuário** — RLS é a única fronteira de permissão; nenhum SQL vindo do modelo, apenas nomes de entidade/coluna validados contra o catálogo, com `count: "exact"` para o total real. Lista de entidades bloqueadas explícita.
- **Abrir registro**: `get_record` (entidade + id/número) e `explain_notification` (resolve `notifications.reference_id` + `notification_type` para a entidade de origem). Enriquecimento em lote de `created_by`/`updated_by` → nome via `profiles_public`. Ambas em `READONLY_TOOLS`; novo módulo `notifications` em `ROLE_MODULES` (escopo próprio para todos; empresa para `director`/`super_admin`).
- **Redução do catálogo de ferramentas**: as ~40 `basicQueryTool` viram atalhos do `query_entity` (mantidos por nome para não quebrar prompts), evitando estouro de contexto no catálogo de tools.
- **Loop de investigação**: em `index.ts`, orçamento de passos por turno (`stepCountIs`-equivalente já existente) com regra de cascata espelho → registro relacionado → origem externa, e obrigação de citar fonte + data do dado.
- **Guardrails** (`guardrails.ts`): `SPECULATION_PATTERNS` + sinal `readToolExecuted`; nova issue `speculation_without_read` com retentativa determinística (mesmo padrão da trava de anúncio de escrita). Quando `offendingSentences` não estiver vazio, pedir reescrita ao modelo antes de aplicar `rewriteOutput`; afinar `BACKSTAGE_PATTERNS` para não apagar explicação de processo (sincronização, espelho, integração) — antes disso, conferir nos logs da função quais regras cortaram as frases dessa conversa.
- **Conectores externos**: tabela `ai_external_connectors` (nome, tipo `rest`/`mcp`, base_url, nome do segredo, ações permitidas, papéis permitidos, `company_id`) com `GRANT`, RLS habilitado e leitura só para `director`/`super_admin`; credenciais sempre em segredos do backend, nunca na tabela. Descoberta em runtime no `ai-assistant`, chamadas via função proxy, seguindo o padrão de `omie-proxy`.
- **Deploy e teste**: `ai-assistant` redeployada e validada com as perguntas reais: "o que é essa notificação [QA] de conta a receber vencida", "quem criou e quando", "quantas contas a receber estão vencidas", "abra a OS 5543 e diga a etapa no Omie".
