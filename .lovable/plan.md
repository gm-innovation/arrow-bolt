# Marina: buscar de verdade em vez de supor

## O que eu verifiquei na sua conversa

Reli a conversa (128 mensagens, a última hoje 09:00 BRT). O trecho que falhou:

- Você perguntou o que era a notificação **"Conta a receber vencida — [QA] Cliente Recebivel — R$ 980,25 — vencimento 25/08/2026"**, quem/por que criou e qual o resultado.
- A Marina respondeu com suposição explícita ("**Provavelmente** o QA estava testando...") e, quando você exigiu certeza, encerrou com "Sinto muito não poder te dar o detalhe".

Motivos confirmados:

1. **Ela não tem nenhuma ferramenta de notificações.** Não existe forma de ela abrir a notificação que você viu, nem de chegar ao registro referenciado por ela. Eu achei em segundos: a notificação é do tipo `payment_overdue` e aponta para uma conta a receber real de R$ 980,25, vencimento 25/08/2026, da Lecsor Technology, criada em 05/08 pela conta do Alexandre Silva — o rótulo "[QA] Cliente Recebivel" vem do **cliente de teste**, não da conta.
2. **A busca em contas a receber não acharia isso mesmo se ela tentasse.** A ferramenta financeira pesquisa só pelo campo de descrição, e nessa conta a descrição está vazia; o texto "[QA] Cliente Recebivel" está no nome do cliente, que ela nem devolve.
3. **Nada permite consultar um registro por id nem quem o criou.** As ferramentas atuais são listagens por status/período; não há "abra este registro específico" nem tradução de "criado por" para nome de pessoa.
4. **Respostas mutiladas.** Várias respostas dela chegaram começando em linha vazia ("...É um processo importante para a integridade dos nossos dados."). O filtro de saída remove frases inteiras sem avisar e sem tentar reescrever — o que sobra parece resposta pela metade. Preciso confirmar nos logs qual regra apagou cada frase antes de ajustar.
5. **Nenhuma trava contra suposição.** Existem travas fortes para escrita (não pode dizer que gravou sem gravar), mas nenhuma para leitura: ela pode responder "provavelmente", "deve ser", "imagino" sobre dado do sistema sem ter consultado nada.

## O que vou fazer

### 1. Ela passa a ver notificações e chegar ao registro de origem
Nova consulta de notificações (as suas e, para diretoria/super admin, as da empresa) com busca por texto, tipo e período. Ao encontrar, ela segue automaticamente para o registro apontado pela notificação (conta a pagar/receber, OS, chamado, solicitação) e responde com os dados reais: valor, vencimento, status, cliente/fornecedor, quem criou e quando.

### 2. Abrir qualquer registro por identificação
Uma ferramenta única de "abrir este registro": recebe o tipo e o id (ou o número/rótulo) e devolve a ficha completa com os relacionamentos resolvidos em nome legível (cliente, empresa, autor, responsável), respeitando o que o perfil pode ver. Isso resolve toda a classe de perguntas "o que é isso que apareceu aqui".

### 3. Busca financeira que realmente encontra
As consultas de contas a pagar/receber passam a pesquisar também por nome do cliente/fornecedor, categoria e valor, e a devolver esses campos — não só a descrição.

### 4. Reconhecer dado de teste
Registros e notificações com marca de teste (prefixo "[QA]") passam a ser identificados como tal na resposta, com autor e data, em vez de virarem teoria. Ela diz o que o registro é, quem o criou e que se trata de dado de homologação — sem inventar intenção que não está gravada.

### 5. Trava contra suposição em leitura
Se a resposta contiver linguagem de palpite ("provavelmente", "deve ser", "imagino", "acredito que") sobre dado do sistema e nenhuma consulta tiver sido executada no turno, a resposta é descartada e ela é obrigada a consultar antes de responder. Se após consultar a informação realmente não existir, ela diz exatamente o que procurou e onde não encontrou — nunca "sinto muito" seco.

### 6. Parar de entregar resposta cortada
Quando o filtro de saída remover frases, ela refaz a resposta em vez de publicar o resto colado. Também vou reduzir o falso positivo que apaga frases legítimas quando você, como administrador, pede explicação técnica.

## Detalhes técnicos

- `supabase/functions/ai-assistant/tools.ts`: novas ferramentas `query_notifications` (tabela `notifications`, filtro por `user_id` próprio; empresa inteira só para `director`/`super_admin`), `explain_notification` (resolve `reference_id` + `notification_type` para a tabela de origem) e `get_record` (mapa tipo→tabela com joins de nome). Todas em `READONLY_TOOLS`; novo módulo `notifications` em `ROLE_MODULES` para todos os papéis (escopo próprio) e leitura ampliada em `ALL`.
- `basicQueryTool`: aceitar `searchRelations` (busca em coluna de tabela relacionada via `!inner`) e incluir `created_by`/`created_at` no retorno padrão, com resolução de nome em lote via `profiles`. Ajuste de `query_finance_payables`/`query_finance_receivables` para incluir cliente/fornecedor e categoria.
- `guardrails.ts`: novo `SPECULATION_PATTERNS` + sinal `readToolExecuted` no turno; `checkOutput` marca `speculation_without_read`. Em `index.ts`, uma retentativa determinística (padrão da trava de anúncio) exigindo consulta antes de responder.
- `guardrails.ts`/`index.ts`: quando `offendingSentences` não estiver vazio, pedir reescrita ao modelo antes de aplicar `rewriteOutput`; restringir `BACKSTAGE_PATTERNS` para não apagar explicação legítima de processo (sincronização, espelho, integração) — verificando primeiro nos logs da função quais regras dispararam nas respostas cortadas dessa conversa.
- Prompt em `index.ts`: bloco "nunca supor sobre dado do sistema" com a cascata notificação → registro de origem → origem externa (Omie/Auvo/EVA), e obrigação de citar quem criou e quando ao explicar um registro.
- Deploy de `ai-assistant` e teste com as perguntas reais: "o que é essa notificação de conta a receber vencida [QA]", "quem criou e quando", "isso é teste ou produção".
