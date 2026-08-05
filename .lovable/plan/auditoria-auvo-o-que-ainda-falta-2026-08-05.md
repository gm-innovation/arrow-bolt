# Auditoria Auvo — o que ainda falta

A base do agrupamento por serviço está funcionando: 739 atendimentos importados desde maio, 736 relatórios, 358 serviços e a OS 4821 já com todos os atendimentos. O que falta são lacunas de operação e confiabilidade, verificadas nos dados atuais.

## 1. Fila de análise não vence o volume

Situação real: 354 serviços com análise `pending` e o job automático processa 4 a cada 10 minutos — cerca de 15 horas para terminar. Enquanto isso, a tela de auditoria mostra números incompletos.

- Aumentar o lote por rodada e reduzir o intervalo do agendamento, com limite de tempo por execução para não estourar o runtime.
- Botão "Processar fila agora" na aba Execuções, com contador de pendentes visível ("354 serviços aguardando análise").
- Processar primeiro os serviços mais recentes e os que têm material baixado do estoque.

## 2. Execuções ficam presas em "rodando"

Situação real: duas execuções iniciadas às 20:31 e 20:35 continuam `running` com contadores em zero, mesmo com atendimentos entrando no banco. Sem finalização nem progresso, o painel não informa nada.

- Gravar progresso durante a ingestão (bloco mensal atual, atendimentos e relatórios acumulados), não só no final.
- Bloquear nova execução manual enquanto houver uma em andamento para a mesma empresa.
- Marcar como `error` execuções sem atualização há mais de 15 minutos (worker morto), para o painel deixar de mentir.
- Mostrar na aba Execuções: período, progresso, duração e erro legível.

## 3. Erro de análise sem explicação

Situação real: 4 serviços com `analysis_status = error` e nenhum campo que registre o motivo.

- Guardar a mensagem de erro e a data da tentativa no serviço.
- Exibir o motivo na linha do serviço com ação "Tentar novamente".
- Reprocessar automaticamente até 3 vezes antes de marcar como erro definitivo.

## 4. Atendimentos e divergências fora de qualquer serviço

Situação real: 6 atendimentos sem serviço (OS vazia ou preenchida como "NA"/"na") e 3 divergências órfãs — nada disso aparece na tela agrupada, ou seja, sai da auditoria silenciosamente.

- Tratar `NA`, `na`, `-` e vazio como "sem número de OS" e agrupar esses atendimentos por cliente + embarcação + janela de datas.
- Criar a aba "Sem serviço vinculado" na auditoria, listando esses atendimentos e divergências com ação para vincular manualmente a um serviço existente.
- Indicador no topo da tela quando existirem itens nessa condição.

## 5. Cobertura da carga histórica

Situação real: os dados começam em 01/05/2026; a sincronização diária olha apenas 7 dias para trás.

- Ação de "Carga histórica" na tela, com escolha do período (padrão: 1º de janeiro do ano vigente), executando em blocos mensais.
- Manter a rotina diária incremental, ampliando a janela para 30 dias, de modo que atendimentos lançados com atraso no Auvo sejam capturados.

## Detalhes técnicos

- `supabase/functions/auvo-sync/index.ts`: atualização incremental de `auvo_sync_runs` (novos campos de progresso), guarda contra execuções concorrentes, lote de análise configurável.
- Migração: colunas de erro/tentativas em `auvo_service_groups`, colunas de progresso em `auvo_sync_runs`, função para expirar execuções travadas.
- `grouping.ts`: normalização de números de OS inválidos e agrupamento por similaridade quando não há OS.
- `cron`: `auvo-analyze-queue` com lote maior e intervalo menor; `auvo-sync-daily` com janela de 30 dias.
- `src/pages/admin/AuvoAudit.tsx` e `src/hooks/useAuvoIntegration.ts`: aba "Sem serviço vinculado", contador de fila, ação de reprocessar e carga histórica.
