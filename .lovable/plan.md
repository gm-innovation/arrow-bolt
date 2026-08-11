# Impedir a Marina de confirmar ações que não aconteceram

## Diagnóstico confirmado

Na conversa de hoje com a oportunidade **“RFQ pelo site — Cahuã”**:

- Às **15:22:55**, a primeira inclusão aconteceu de verdade: foi criado um item `KIT OVERHAUL STD22`, quantidade 1, valor R$ 4.212,60.
- Às **15:23:17**, a Marina afirmou “inseri mais uma unidade”, mas **não houve inclusão nem atualização no banco**.
- Às **15:23:59**, ela voltou a prometer a correção para R$ 8.425,20, novamente **sem executar nenhuma escrita**.
- O histórico de auditoria confirma apenas duas ações reais: a inclusão inicial e a remoção posterior. As duas alegações intermediárias não têm ação correspondente.

A proteção atual depende de `sawWriteIntentTool`, que só é ativado quando o modelo chama `list_opportunity_products`. Nos turnos “insira mais 1” e “não adicionou, onde está?”, o modelo respondeu diretamente; portanto, a proteção não foi acionada.

## Correção

### 1. Detectar intenção de escrita pela mensagem do usuário

- Identificar inclusão, aumento, redução e remoção diretamente no pedido atual e no contexto imediato, sem depender de o modelo ter chamado uma ferramenta antes.
- Tratar acompanhamentos como “mais 1”, “corrija”, “faça agora” e “não adicionou” como continuação da última ação de produto.
- Quando a intenção estiver clara, impedir que uma resposta textual finalize o turno antes de uma ferramenta de escrita retornar sucesso ou de surgir uma ambiguidade real.

### 2. Exigir comprovante de execução antes da confirmação

- Registrar, durante o turno, o resultado estruturado de cada ferramenta de escrita: ferramenta, registro afetado, sucesso/erro e valores retornados.
- Permitir frases como “adicionei”, “removi” ou “atualizei” somente quando houver um resultado `ok: true` no mesmo turno.
- Se não houver comprovante, descartar a resposta do modelo e exigir a execução; se ainda assim não executar, responder de forma honesta que a alteração não foi concluída, sem alegar sucesso.

### 3. Verificar o estado real após cada alteração de item

- Depois de adicionar, atualizar ou remover, consultar novamente os itens da oportunidade no servidor.
- Confirmar que o estado esperado existe: quantidade/contagem correta, item real e novo total da oportunidade.
- O texto final receberá um bloco de resultado verificado e deverá citar somente esses dados.
- Se a gravação retornar sucesso, mas a conferência não bater, tratar como falha e não confirmar ao usuário.

### 4. Tornar “mais 1” determinístico

- Quando já existir o mesmo produto na oportunidade e o usuário pedir “mais 1”, aumentar a quantidade do item existente em vez de criar uma afirmação baseada em cálculo mental.
- Respeitar o saldo máximo do EVA considerando a quantidade final pretendida.
- Devolver na ferramenta a quantidade anterior, a nova quantidade, o saldo disponível e o total recalculado.

### 5. Auditoria visível no histórico técnico

- Salvar nos metadados da resposta da Marina o comprovante da ação executada e verificada, sem expor detalhes internos na interface comum.
- Isso permitirá distinguir respostas informativas de confirmações de escrita e investigar qualquer divergência futura sem depender apenas do texto da conversa.

## Validação obrigatória

Executar um cenário limpo e conferir simultaneamente conversa, auditoria e banco:

```text
Estado inicial: KIT com quantidade 1 e oportunidade em R$ 4.212,60
“insira mais 1”
Resultado esperado: quantidade 2, total R$ 8.425,20 e confirmação somente após releitura

Simular ferramenta com erro
Resultado esperado: nenhuma frase no passado; informar que não concluiu

Simular modelo respondendo “adicionei” sem ferramenta
Resultado esperado: resposta bloqueada e execução forçada; se não executar, falha honesta

“não adicionou, onde está?” após uma falha
Resultado esperado: consultar estado real, reconhecer a divergência e só corrigir após gravação verificada
```

Também validar que remoção, saldo zero, saldo insuficiente e desambiguação de variantes continuam funcionando sem regressão.

## Arquivos envolvidos

- `supabase/functions/ai-assistant/index.ts`: detecção de intenção, bloqueio de falsa confirmação, releitura e composição do resultado verificado.
- `supabase/functions/ai-assistant/tools.ts`: aumento determinístico, retorno de antes/depois e verificação pós-escrita.
- Testes da função `ai-assistant` para cobrir confirmação verdadeira, falha de escrita e falsa alegação do modelo.

Não haverá alteração de schema nem correção manual dos dados: a oportunidade está atualmente sem itens porque a remoção posterior foi uma ação real.
