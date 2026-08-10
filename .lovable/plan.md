# Material devolvido ao estoque deixa de ser divergência

Hoje a auditoria compara só a **saída** de material (EVA) com o que o relatório do técnico declara. Se o material saiu e voltou para o estoque sem ser usado, ele aparece como "material retirado sem relato" (severidade crítica) — falso positivo.

A API de retornos da LOGVI resolve isso. Verifiquei o endpoint: ele devolve 1.144 movimentações do tipo `standby-servico-retorno`, cada uma com **número da OS** (`os_numero`), **embarcação**, data (`criado_em`) e a lista de itens com produto (código/nome), quantidade e custo unitário. Aceita filtros `date_from`, `date_to`, `limit`, `offset`. Observação relevante: cerca de 60% dos retornos vêm com `os_numero` = "n/a" — nesses casos o vínculo tem de ser feito pela embarcação + data.

## Como vai funcionar

1. Ao auditar um serviço, além de buscar as baixas no EVA, o sistema busca os retornos da LOGVI.
2. Para cada produto, a quantidade devolvida é abatida da quantidade que saiu:
   - **Devolvido por inteiro** → sai da lista de divergências. Nada a explicar.
   - **Devolvido em parte** → a divergência passa a considerar apenas o saldo que ficou em campo, com o valor em risco recalculado sobre esse saldo.
   - **Sem retorno** → continua crítico, como hoje.
3. Casamento do retorno com o serviço, em ordem de confiança:
   - `os_numero` igual a uma das OS do serviço (sinal primário);
   - quando o retorno vem com OS "n/a": embarcação igual à do serviço **e** data do retorno dentro de uma janela após o atendimento (30 dias), usando a mesma normalização de texto já usada no cruzamento EVA.
4. Na revisão, cada item mostra a quantidade devolvida e a data/responsável do retorno, para o revisor entender por que o alerta sumiu ou diminuiu. Itens integralmente devolvidos aparecem como informação ("devolvido ao estoque"), não como pendência.

## Detalhes técnicos

- **Segredo**: o token da LOGVI vai para `LOGVI_API_TOKEN` (secret do backend). Não fica no código nem no frontend.
- **Novo módulo** `supabase/functions/auvo-sync/returns.ts`:
  - `fetchLogviReturns(token, { dateFrom, dateTo })` → POST no endpoint, normaliza para `{ movementId, orderNumber, vessel, createdAt, responsavel, items: [{ code, name, quantity, unitCost }] }`.
  - `matchReturnsToService({ returns, orderNumbers, vesselName, taskDates })` → soma quantidades devolvidas por produto (chave: código do produto, com fallback por nome normalizado, já que a LOGVI não expõe o `produto_id` do EVA de forma garantida).
  - Cache em memória por invocação da função (uma chamada só, reaproveitada por todos os serviços auditados no mesmo ciclo).
- **`crosscheck.ts`**: `crossCheck(evaItems, reported, returnedByProduct)` passa a receber o mapa de devolvidos e:
  - reduz `stock_quantity` pelo devolvido;
  - se o saldo chega a zero, gera classificação `stock_returned` com severidade `low` e `value_at_risk` 0 (ou omite, conforme decisão de exibição — ver pergunta abaixo);
  - preenche os novos campos `returned_quantity` e `return_reference`.
- **`index.ts`**: busca os retornos junto ao EVA em `analyzeServiceGroup` e repassa ao cruzamento; falha da LOGVI é registrada em log e a auditoria segue com o comportamento atual (nunca quebra a análise).
- **Banco**: `ALTER TABLE public.auvo_material_discrepancies ADD COLUMN returned_quantity numeric DEFAULT 0, ADD COLUMN return_reference jsonb`. Não há check constraint em `classification`, então o novo valor não exige migração de enum.
- **Frontend**: mapas de rótulo/cor em `AuvoAudit.tsx`, `AuvoGroupReviewDialog.tsx`, `AuvoDiscrepancyTab.tsx`, `AuvoReportPanel.tsx` e nos hooks de insights/resumo crítico ganham `stock_returned` (rótulo "Devolvido ao estoque", tom neutro) e a exibição da quantidade devolvida no item.
- **Reauditoria**: após o deploy, os serviços com pendências de material entram novamente na fila de análise para que os falsos positivos sejam limpos.

## Pergunta

Itens 100% devolvidos devem **desaparecer** da lista ou aparecer como linha informativa "devolvido ao estoque" (sem contar como pendência nem valor em risco)? Vou implementar como linha informativa, que preserva a rastreabilidade — diga se prefere sumir de vez.
