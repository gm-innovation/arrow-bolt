# Memória e contexto contínuo da Marina

## O problema real

Hoje a Marina só tem contexto onde alguém programou contexto à mão. Na Edge Function existem três "gavetas" específicas em `ai_conversations.context`: `session_summary`, `last_stock_lookup` e `last_opportunity_lookup`. Fora desses três assuntos, cada turno começa quase do zero: o histórico enviado ao modelo é apenas o texto das últimas mensagens, e os resultados das ferramentas (itens de uma oportunidade, colaborador consultado, OS aberta, documento localizado) não são guardados em lugar nenhum.

Consequência: em "remova 1 kit" ela lista o catálogo inteiro em vez do item que estava em foco — e o mesmo tipo de perda acontece em RH, OS, qualidade, financeiro. Não é um bug de oportunidade; é ausência de memória de trabalho.

## O que vai ser construído

### 1. Foco da conversa (memória de curto prazo, genérica)

Uma única estrutura de foco por conversa, substituindo as gavetas ad hoc: para cada entidade que a Marina toca (oportunidade, cliente, OS, colaborador, produto, documento, requisição, ticket) guarda-se tipo, id, rótulo legível, quando foi mencionada e o último resultado de ferramenta relacionado.

Em cada turno, o servidor injeta o foco ativo e, quando o pedido é sobre a entidade em foco, injeta também a listagem atual dos filhos (itens, documentos, tarefas) relida no banco naquele momento. Referências como "esse", "dele", "o mesmo", "remova 1", "e o preço?" passam a resolver sem perguntar nada.

### 2. Memória de longo prazo por pessoa

Além do estilo de interação que já existe (`ai_user_preferences`), uma memória de fatos por usuário: no que ele trabalha, clientes e OS que acompanha, decisões tomadas, combinações feitas ("não me chame de senhor", "sempre confirmar antes de gravar", "meus clientes são do Rio"). A Marina passa a lembrar entre sessões e entre dispositivos, e o usuário pode ver e apagar essa memória na área da conta.

### 3. Histórico acessível de verdade

As conversas já ficam gravadas, mas não são pesquisáveis pela Marina. Passa a existir busca semântica sobre as conversas anteriores do próprio usuário, com recorte por empresa e por permissão. "O que a gente combinou sobre o kit overhaul semana passada?" vira uma consulta ao histórico, não um chute.

### 4. Subagentes de contexto (a parte que você levantou)

Antes de responder, quando a mensagem é curta, ambígua ou faz referência a algo anterior, o servidor dispara em paralelo buscadores especializados e leves — cada um responsável por um assunto: comercial, operação/OS, RH, qualidade, financeiro, histórico de conversas, memória do usuário. Cada um devolve um resumo curto e factual, com identificadores reais; o conjunto é montado num único bloco de contexto entregue à Marina.

Por que subagentes ajudam aqui: eles trazem dados, não decisões. A Marina continua sendo a única a falar com o usuário e a única a executar escrita, com as travas atuais (confirmação, verificação pós-gravação, proibição de confirmar o que não aconteceu) intactas. Assim ganhamos contexto amplo sem inflar o prompt principal e sem multiplicar risco de alucinação.

Regras: buscadores são somente leitura, rodam com a permissão do usuário, têm limite de tempo e caem em silêncio se falharem — nunca travam a resposta. Só são acionados quando há sinal de referência ou ambiguidade, para não custar tempo em toda mensagem.

### 5. Correção imediata do caso do print

Pedido de remoção/redução de item deixa de disparar busca no catálogo EVA. Os candidatos passam a ser exclusivamente os itens da entidade em foco; com um único item compatível, ela age; com vários, lista os itens reais com quantidade atual. Nunca mais uma lista de 9 produtos de catálogo como resposta a "remova 1 kit".

## Ordem de entrega

1. Foco da conversa + correção do caso de remoção (resolve a dor de hoje).
2. Memória de longo prazo por pessoa, com painel de visualização/limpeza.
3. Busca no histórico de conversas.
4. Subagentes de contexto por assunto, ligados assunto a assunto.

## Detalhes técnicos

- `supabase/functions/ai-assistant/index.ts`: substituir `last_stock_lookup` / `last_opportunity_lookup` por um `focus` genérico em `ai_conversations.context` (lista curta, com TTL por turnos); relistagem dos filhos da entidade em foco no próprio turno; supressão da consulta de catálogo quando a intenção é remoção; montagem do bloco único de contexto.
- Nova tabela de memória por usuário (fatos + origem + data), com `GRANT`, RLS habilitado e política de acesso somente ao próprio usuário; leitura/escrita por ferramentas dedicadas usando o token do usuário.
- Busca no histórico: embeddings das mensagens de `ai_messages` reaproveitando a infraestrutura de `ai_knowledge_chunks`, com filtro por usuário e empresa.
- Subagentes: implementados como chamadas paralelas de leitura dentro da própria Edge Function (modelo pequeno + ferramentas de consulta já existentes por módulo), com timeout individual e resultado limitado em tamanho; nenhuma ferramenta de escrita disponível para eles.
- Frontend: seção de memória em Minha Conta (ver, editar, apagar). Sem mudança nas telas operacionais.
