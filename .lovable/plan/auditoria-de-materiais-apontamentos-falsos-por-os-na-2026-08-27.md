# Auditoria de materiais: apontamentos falsos por OS "NA"

## O que aconteceu

A auditoria atribuiu a mesma retirada de estoque a serviços que não têm nada a ver com ela.

Consultei o banco e confirmei: as OS **2990**, **5308** e um serviço sem OS (Skandi Angra) recebem exatamente **os mesmos 31 itens**, com os mesmos códigos (PRD00018 a PRD02386), a mesma retirada ("baixa registrada por Adriely Passos, retirada por Wagner Viana de Brito") e valores idênticos. Não é coincidência: é um único bloco de material duplicado três vezes.

A causa: quando o serviço é cadastrado no Auvo sem número de OS, o campo vem preenchido com o texto **"NA"** (não aplicável). Hoje o sistema trata esse "NA" como se fosse um número de OS válido e vai buscar no estoque tudo que estiver marcado como "NA". Como todo material sem OS definida cai nesse mesmo saco, o bloco inteiro é colado em qualquer serviço que tenha um atendimento com OS "NA" — e a OS 2990 tem um atendimento assim.

É por isso que você procura no LOGVI pela OS 2990 e não encontra nada: **esse material nunca saiu para a 2990**. O apontamento é do sistema, não do estoque.

## Tamanho do estrago

- 4 atendimentos com OS registrada como "NA", em 3 serviços.
- **97 dos 578 apontamentos** vêm dessa contaminação.
- **R$ 478,3 mil dos R$ 537,7 mil** de "risco identificado" são falsos.
- Risco real remanescente após limpeza: aproximadamente **R$ 59,4 mil**.
- Nenhum apontamento foi revisado/decidido ainda, então nada de trabalho humano se perde na limpeza.

## O que vou corrigir

1. **Bloquear números de OS inválidos na busca de estoque.** Só números reais de OS consultam o estoque. Textos como "NA", "N/A", "00", "sem", "s/n" e vazios passam a ser ignorados — nunca mais servem de chave de busca.
2. **Serviço sem OS não cruza material.** Se o serviço não tem nenhuma OS válida, ele não recebe apontamento de material; entra na tela como "sem OS para auditar", que é uma informação honesta e acionável (alguém precisa registrar a OS no Auvo).
3. **Blindar do outro lado também.** A mesma regra vale para as devoluções e para a busca de saídas: retirada sem OS válida no estoque não é indexada como se OS fosse.
4. **Limpar o passivo.** Apagar os 97 apontamentos gerados por essa falha e recolocar os 3 serviços afetados na fila para nova análise, agora com a regra correta.
5. **Trava de sanidade.** Se um mesmo conjunto de itens for atribuído a serviços diferentes na mesma execução, a sincronização registra o alerta no histórico em vez de gravar em silêncio — para que um erro parecido apareça na hora, não semanas depois.

## Detalhes técnicos

- `supabase/functions/auvo-sync/withdrawals.ts`: `normalizeOrder` hoje aceita qualquer texto alfanumérico, então `"NA"` virou chave de índice. Passa a exigir número de OS válido (3 a 6 dígitos, com prefixo `OS` opcional) e a descartar o restante, tanto na indexação quanto na consulta.
- `supabase/functions/auvo-sync/index.ts`, em `analyzeServiceGroup`: o conjunto `orderNumbers` mistura `group.order_numbers` com `task.order_number` sem validar. Passa a filtrar pela mesma função de validação; conjunto vazio encerra a análise de material sem gravar divergência, marcando o serviço com status próprio.
- `supabase/functions/auvo-sync/crosscheck.ts` (`fetchEvaMaterials`) e `returns.ts` (`matchReturnsToService`): mesma validação aplicada antes de qualquer chamada externa, evitando consulta com parâmetro inválido.
- Limpeza de dados: remoção dos registros de `auvo_material_discrepancies` cujos serviços têm apenas OS inválida, e reset de `analysis_status` dos 3 grupos afetados.
- Após as alterações, reimplantar a função de sincronização e reprocessar os serviços afetados para conferir que a 2990 volta a mostrar zero material sem relato.
