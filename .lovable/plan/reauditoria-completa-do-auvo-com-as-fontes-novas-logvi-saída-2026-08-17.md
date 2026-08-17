# Reauditoria completa do Auvo com as fontes novas (LOGVI saídas + retornos)

## O que eu verifiquei agora

- Existem **581 serviços** auditados e **572 deles foram analisados antes** da entrada da LOGVI como fonte de saídas (a análise mais antiga é de 05/08; só 9 passaram pela leitura nova). Ou seja: quase toda a base ainda reflete o cruzamento antigo da EVA, com quantidade estimada.
- Divergências atuais no banco: 21 "baixado sem relato" (R$ 13.396,03 em risco), 2 de quantidade (R$ 5.025,16), 37 devolvidas, 107 "relatado sem baixa", 10 confere. **Nenhuma linha tem revisão humana** (`review_status` todo pendente), então recalcular tudo não descarta trabalho de ninguém.
- Bug estrutural adicional, visível na OS 4821: o MAGNETRON MG4010 saiu na LOGVI a **US$ 1.016,75 × 2 (moeda USD)** e a auditoria mostra **R$ 2.033,50** — o campo `moeda` do payload é ignorado em `withdrawals.ts`, então dólar é somado como real e o risco total fica errado.
- A OS 4821 tem 6 saídas na LOGVI (com PRD00047 em 3 linhas separadas, que precisam somar 4) e 14 retornos; o modal mostra 10 materiais, número que só será confiável depois do recálculo com saídas e retornos das fontes novas.

## O que vai ser feito

1. **Moeda tratada de verdade.** A leitura das saídas passa a registrar a moeda de cada item. Itens em dólar deixam de ser somados como se fossem reais: o valor é convertido para real por uma cotação registrada na própria análise (e a divergência mostra "US$ 1.016,75 × 2" junto do valor em real), para o risco total parar de misturar moedas.
2. **Reauditoria de toda a base, não só dos serviços com apontamento.** Os 581 serviços voltam para a fila de análise e são reprocessados com saídas LOGVI, retornos LOGVI e a nova regra de moeda. A fila roda em lotes com a reserva atômica já implementada, então nada é analisado duas vezes em paralelo.
3. **Limpeza do resíduo antigo.** As divergências geradas pelo cruzamento antigo (inclusive as marcadas como quantidade estimada) são apagadas antes do recálculo, para não sobrar linha órfã de item que a LOGVI mostra com quantidade diferente. Como não há revisão humana, nada de conclusão do coordenador se perde.
4. **Verificação com evidência.** Ao fim, comparo na mão a OS 4821, a 4475 e mais alguns serviços com apontamento contra as telas da LOGVI (saídas e retornos), conferindo quantidade, moeda e valor, e reporto o painel final: nº de serviços, divergências por tipo e risco total.
5. **Acompanhamento na tela.** A tela de auditoria mostra o andamento da reauditoria (quantos serviços faltam) enquanto a fila é consumida, para você não ficar olhando número parcial sem saber que ainda está processando.

## Detalhes técnicos

- `withdrawals.ts`: propagar `moeda` do item (`WithdrawalItem.currency`), sem inventar valor quando ausente; agregação por produto passa a agregar por produto+moeda para não somar USD com BRL.
- `crosscheck.ts` / `index.ts`: `EvaItem` ganha `currency` e `unit_value_original`; `value_at_risk` sempre em BRL, com a conversão aplicada na montagem do item e a origem registrada em `ai_notes` ("US$ 1.016,75 × 2 · câmbio X").
- Cotação: constante única na função (parametrizável por variável de ambiente `USD_BRL_RATE`), aplicada só a itens em USD — sem chamada externa de câmbio nesta etapa.
- Reset da fila via ferramenta de dados: `DELETE` das divergências não revisadas + `UPDATE auvo_service_groups SET analysis_status='pending', analysis_attempts=0, analysis_error=NULL`. Sem mudança de schema, logo sem novos GRANTs.
- Consumo da fila: invocações sucessivas de `auvo-sync` em `analyze_batch` até `remaining = 0`, respeitando o orçamento de tempo por invocação já existente.
- Frontend: `AuvoAudit.tsx` / `useAuvoIntegration` exibem `remaining` da fila como indicador de reauditoria em andamento; sem mudança de layout além disso.
