# Revisão em tempo real durante a auditoria

## Objetivo

Hoje, enquanto a IA processa a fila (análise de materiais e auditoria de fotos), a tabela de divergências só reflete o resultado quando o lote termina ou quando a página é recarregada. A revisão humana fica parada esperando. A ideia é fazer a lista crescer sozinha, item a item, conforme a IA vai encontrando.

## O que muda

1. **Atualização automática enquanto há processamento**
   - Enquanto existir fila pendente (serviços aguardando análise ou relatórios pendentes de auditoria de fotos), as listas de divergências, de lacunas de foto e os cartões de contagem passam a se atualizar sozinhos a cada poucos segundos.
   - Ao terminar a fila, o auto-refresh para (sem consultas desnecessárias).

2. **Novos achados destacados**
   - Serviços/OS que apareceram na lista depois que a revisão começou recebem um selo "novo" temporário, para o revisor saber onde continuar.
   - A ordem da lista não muda embaixo do cursor: novos grupos entram sem reordenar os que já estão abertos/expandidos.

3. **Progresso mais claro**
   - Barra de progresso nos dois painéis (fila de análise e auditoria de fotos) com contagem viva: processados / total, achados até agora.
   - Botão de processar continua permitindo rodar em lotes, mas a tela deixa de parecer "travada" durante o processo.

4. **Sem bloqueio de filtro**
   - Quando um filtro estiver ativo e novos itens caírem fora dele, um aviso discreto informa "X novos achados fora do filtro atual" com atalho para limpar o filtro. Isso evita a tela vazia que aparece hoje quando o filtro é restritivo enquanto a auditoria roda.

## Sobre a lista "Recorrência" (aba Indicadores)

Ela não é uma lista de pendências para revisar — é o painel gerencial de concentração de divergências, agrupado por técnico (ou por cliente). Cada linha responde: quantas divergências foram detectadas para aquele técnico/cliente, quantas já foram tratadas (corrigidas), quantas seguem pendentes, quantas são do tipo mais grave ("sem relato" = material com baixa no estoque e sem menção no relatório), o valor total em risco e o valor já tratado.

O objetivo é apontar padrão: se um mesmo técnico ou cliente repete divergências, o problema é de processo (treinamento, preenchimento de relatório, controle de almoxarifado), não um caso isolado. É a base para ação corretiva e para medir se a auditoria está gerando valor.

## Detalhes técnicos

- `src/hooks/useAuvoIntegration.ts`: adicionar `refetchInterval` condicional nas queries `auvo-discrepancies`, `auvo-photo-findings`, `auvo-service-groups` e `auvo-photo-audit-progress`, ativo somente quando `photoAuditProgress.pending > 0`, houver grupos pendentes de análise ou uma mutation de processamento estiver em andamento.
- Manter as invalidações por rodada já existentes em `runPhotoAudit` (elas continuam servindo como push imediato).
- `src/pages/admin/AuvoAudit.tsx`: barra de progresso nos dois cartões, marcação de grupos novos (comparando ids vistos em um `useRef` de snapshot inicial) e aviso de "novos achados fora do filtro".
- `src/components/manager/dashboard/AuvoDiscrepancyTab.tsx`: herdar o mesmo comportamento de atualização viva via `useAuvoCriticalSummary` (refetch enquanto houver fila).
- Nenhuma mudança de schema, de Edge Function ou de regra de negócio.
