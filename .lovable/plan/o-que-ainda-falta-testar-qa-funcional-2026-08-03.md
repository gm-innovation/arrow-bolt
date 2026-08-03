# O que ainda falta testar (QA funcional)

## Já verificado ponta a ponta

- Correções anteriores revalidadas (embeds, relatórios técnicos, loop de renderização, papel duplicado).
- Escritas simples confirmadas na listagem: conta a pagar, conta a receber, tarefa comercial, oportunidade, cliente, ASO, requisição de compra, post no feed.
- Cenário 1 parcial: login do coordenador, tipo de tarefa, cliente, embarcação e formulário de OS preenchido até a data/tipo de tarefa.
- Negativos de rota: financeiro, comercial e técnico bloqueados fora da própria área.

## Faltou (por cenário)

**1. Ciclo de vida da OS — interrompido na seleção de técnicos**
Falta: selecionar técnico e salvar a OS; técnico ver a OS na própria área; apontamento de horas; envio de relatório; medição final pelo coordenador; conferência de que as horas do técnico entraram na medição; categoria de ISS e cálculo "por dentro"; finalização da medição; negativa de acesso do técnico a OS de outro.

**2. Aprovação de compra (multi-papel)** — nada além da criação da requisição.
Falta: total calculado pelo gatilho conferido contra a soma dos itens; envio para aprovação; diretor aprovando na fila; transição de status na ordem correta; notificação ao solicitante; coordenador **não** conseguir aprovar.

**3. Admissão e conformidade documental (RH)** — só o ASO foi gravado.
Falta: cadastrar colaborador; enviar documento obrigatório do cargo; painel de conformidade mudando de pendente para em revisão; aprovação pelo RH; colaborador abrindo e baixando o próprio documento (regressão do bug de bucket); validade do ASO gerando alerta de vencimento; solicitação de férias (gatilho do Sheet não alcançável por rótulo acessível).

**4. Pipeline comercial** — só criação isolada de oportunidade e tarefa.
Falta: lead convertido em oportunidade; produto adicionado e valor total conferido; avanço de etapa no Kanban; marcação de ganho; reflexo no dossiê do cliente e baixa de estoque.

**5. Financeiro** — só os lançamentos.
Falta: baixa de pagamento e de recebimento com status e valor pago conferidos; dashboard refletindo os lançamentos.

**6. Corporativo e permissões**
Falta: solicitação corporativa criada por colaborador (gatilho não alcançável por rótulo acessível), roteamento ao departamento correto, resposta do diretor, notificação in-app chegando ao solicitante. Falta também a matriz de negação por RLS: cada papel tentando 2 escritas proibidas e falhando no banco, não apenas por redirecionamento de rota.

**7. Asserção de banco** — praticamente ausente até aqui.
Os testes confirmaram "apareceu na listagem", não os valores gravados nas colunas. Falta conferir por consulta os totais, status e vínculos de cada registro criado.

Fora de escopo, como antes: módulo de Qualidade (ISO 9001).

## Ajustes de acessibilidade necessários para destravar

- Rótulo acessível no seletor de técnicos do formulário de OS (bloqueou o cenário 1).
- `aria-label` nos gatilhos de Sheet de Férias e de Solicitação Corporativa.
- Rótulos de botão consistentes ("Nova/Novo ...") nas telas onde o gatilho não é alcançável por papel de acessibilidade.

## Ordem proposta para a próxima rodada

1. Destravar acessibilidade (3 ajustes acima).
2. Concluir o cenário 1 completo, incluindo medição e ISS.
3. Compras com aprovação do diretor e matriz de negação.
4. RH documental (com a regressão de download).
5. Comercial, financeiro e corporativo.
6. Atualizar o relatório de QA e o PDF com esta rodada, e limpar os registros `[QA]`.

## Detalhes técnicos

- Scripts em `/tmp/browser/arrow-qa/e2e/<cenario>.py`, reaproveitando `lib.py`; contextos separados por papel.
- Escritas sempre pela interface; consulta de leitura ao banco ao final de cada passo comparando com valores calculados no script.
- Coleta por passo: console, `pageerror`, respostas ≥ 400 e captura de tela.
