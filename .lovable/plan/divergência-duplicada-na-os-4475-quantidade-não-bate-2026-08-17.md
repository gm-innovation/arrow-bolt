# Divergência duplicada na OS 4475 (quantidade não bate)

## O que eu verifiquei

- Na LOGVI a OS 4475 tem **uma única saída**: KIT OVERHAUL STD22 (PRD00089), quantidade 1, R$ 2.478,00 — e nenhum retorno.
- No banco, o serviço dessa OS tem **duas linhas idênticas** de divergência para o mesmo produto (id 125), cada uma com quantidade 1 e R$ 2.478,00 — por isso o modal mostra "2 materiais · risco total R$ 4.956,00".
- As duas linhas foram gravadas no mesmo segundo (12:58:13.114 e 12:58:13.135) e **uma delas não tem** o trecho "Baixa registrada por Priscila Brito · retirado por CARLOS AUGUSTO KREISCHER". Ou seja: uma veio pela leitura LOGVI e a outra por uma execução paralela que caiu no caminho antigo (EVA).

Conclusão: a quantidade lida da LOGVI está correta (1). O problema é **duplicação de registro por execução concorrente da auditoria**, não erro de quantidade.

## Causa

O lote de reauditoria (`analyze_batch`) seleciona os serviços com `analysis_status = 'pending'` mas só muda o status ao terminar a análise. Duas invocações simultâneas (o lote em segundo plano + a reauditoria disparada pela tela) pegam o mesmo serviço, cada uma apaga as divergências e insere as suas — como o apagar e o inserir não são atômicos, sobram as duas inserções. Não existe hoje nenhuma restrição no banco que impeça duas linhas iguais para o mesmo serviço/produto.

## O que vai ser feito

1. **Reserva do serviço antes de analisar**: o lote passa a marcar o serviço como "em análise" de forma atômica (só continua quem conseguiu reservar). Quem perder a disputa ignora aquele serviço, então dois processos nunca auditam o mesmo trabalho ao mesmo tempo.
2. **Trava no banco**: índice único por serviço + produto (e por serviço + nome, quando não há código de produto) em `auvo_material_discrepancies`, com a gravação passando a ser um "upsert". Assim, mesmo em corrida, a linha é atualizada em vez de duplicada.
3. **Limpeza do que já duplicou**: remoção das linhas repetidas já existentes, preservando a que tem revisão humana (ou, em empate, a mais completa/antiga). A OS 4475 volta a mostrar 1 material e R$ 2.478,00.
4. **Conferência**: reauditar a OS 4475 e mais alguns serviços com apontamento, comparando quantidade e valor com a tela da LOGVI.

## Detalhes técnicos

- `supabase/functions/auvo-sync/index.ts`:
  - em `analyze_batch`, trocar o `select pending` + análise por uma reserva otimista (`update ... set analysis_status='analyzing' where id = ... and analysis_status='pending'` e só seguir se voltar a linha); em erro/fim, o status volta para `pending`/`done` como já ocorre hoje. Considerar também `analysis_status='analyzing'` com carimbo antigo como reelegível (destravamento de execução morta), reaproveitando a ideia já usada em `auvo_expire_stuck_sync_runs`.
  - substituir o `delete` + `insert` das divergências por `upsert` com `onConflict` na nova chave, mantendo a preservação de `review_status`/`review_notes` que já existe.
- Migração: coluna gerada/normalizada de chave do item (`external_product_id` ou nome normalizado) + `UNIQUE (service_group_id, item_key)`, precedida do `DELETE` das duplicatas atuais. Sem novas tabelas, logo sem novos GRANTs.
- Sem mudança de UI: o modal de revisão já soma o que existe no banco.
