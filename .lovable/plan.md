# Marina perdendo o contexto ao remover item

## O que aconteceu

Você pediu "remova 1 kit" dentro de uma conversa que já tratava de uma oportunidade específica e de um item já incluído (KIT OVERHAUL STD22). A Marina respondeu com uma lista de 9 kits do catálogo EVA — produtos que nunca estiveram na oportunidade — e pediu para você escolher.

Causa confirmada no servidor (`supabase/functions/ai-assistant/index.ts`):

- A frase contém "kit" e "remova", e ambos os termos estão nos gatilhos da **consulta obrigatória ao estoque EVA** (linhas 384-449). Então o servidor injetou o catálogo inteiro de kits no contexto do turno, mesmo sendo um pedido de remoção.
- A lista dos **itens atuais da oportunidade** só é injetada quando a busca de oportunidades daquele turno devolve exatamente 1 candidato (linha 527). Numa mensagem curta como "remova 1 kit" não há pistas de cliente/título, então essa injeção pode não acontecer.
- Resultado: o único conjunto de dados na mesa era o catálogo EVA, e a Marina montou a pergunta de desambiguação a partir dele.

## Correções

### 1. Remoção nunca consulta o catálogo
Quando a intenção do turno é remover/reduzir/excluir item, o servidor não executa a busca de produtos no EVA. Catálogo serve para incluir produto novo, não para tirar item existente.

### 2. Contexto ativo da oportunidade entre turnos
Persistir na conversa a oportunidade em foco e a última listagem de itens (mesmo mecanismo já usado por `last_stock_lookup` / `last_opportunity_lookup`). Assim "remova 1 kit" continua na oportunidade em que a conversa já estava, sem precisar de novas pistas.

### 3. Listar itens sempre que houver oportunidade em foco
A relistagem dos itens passa a acontecer também quando a oportunidade vem do contexto persistido — não apenas quando a busca do turno devolve exatamente um candidato.

### 4. Desambiguação apenas entre itens reais
Regra na persona: para remover, os candidatos são exclusivamente os itens da oportunidade. Com um único item compatível, executar direto (reduzindo a quantidade ou excluindo o registro, conforme a regra P4 já existente). Com vários, listar apenas os itens da oportunidade, com quantidade atual. Nunca oferecer produto do catálogo como opção de remoção.

### 5. Validação
Reproduzir a sequência real: pergunta sobre o kit, inclusão, depois "remova 1 kit" — e conferir nos logs que nenhuma consulta EVA rodou nesse turno, que a listagem de itens foi injetada e que a ferramenta de escrita foi executada com verificação pós-gravação.

## Detalhes técnicos

- `supabase/functions/ai-assistant/index.ts`: calcular a intenção de remoção antes do bloco de estoque e usá-la para suprimir `query_stock_products`; gravar `active_opportunity` e `last_item_lookup` em `ai_conversations.context`; ampliar a condição da linha 527 para aceitar a oportunidade do contexto persistido; ajustar o texto injetado e as regras P4/P7 do prompt para restringir a desambiguação de remoção aos itens da oportunidade.
- Sem alteração de banco, de RLS ou de telas.
