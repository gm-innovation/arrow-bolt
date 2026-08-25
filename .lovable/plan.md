# Lista de OSs e agenda: enriquecimento, ordenação e overflow

## Diagnóstico confirmado nesta sessão

1. **Parser do Auvo lê o formato errado.** O texto de orientação hoje vem como `Chave: Valor` (dois-pontos), mas tanto a função SQL `parse_auvo_orientation` quanto `parseOrientation` no `auvo-sync` só aceitam `Chave; Valor` (ponto e vírgula). No banco: 1.012 tarefas com `Embarcação:` contra 684 com `Embarcação;` — e apenas 684 tarefas têm `vessel_name_parsed`, 719 têm `team_name`.
2. **A chave de coordenador mudou.** O mapa espera `Coordenação`; os dados reais usam `Coordenador:`. Resultado: só 15 de 1.921 tarefas têm `coordinator_name`.
3. **Efeito na lista de OSs:** 4.972 OSs, mas só 482 com embarcação vinculada e 828 com coordenador. Data de abertura e valor do Omie estão praticamente completos (4.961), então o problema é o lado Auvo.
4. **Cobertura do Auvo:** 1.921 tarefas cobrindo 828 OSs. Há 2.899 OSs com data a partir de 2025 — ou seja, existe muita OS do Omie sem projeto Auvo correspondente na janela já sincronizada.
5. **Ordenação:** o hook `useServiceOrders` ordena por `created_at desc` (data de importação), o que embaralha os números. `order_number` é texto, então ordenar direto por ele também sairia errado (999 acima de 5000).
6. **Agenda:** a visão mensal renderiza todos os eventos do dia sem limite nem indicador (célula estica/corta); a visão semanal usa corte fixo em 18 itens dentro de um contêiner com rolagem, sem indicação de que há mais abaixo.

## O que será feito

### 1. Extração correta dos dados do Auvo
- Aceitar `:` e `;` como separador no parser (SQL e TypeScript), tolerante a acento, caixa e espaços.
- Reconhecer as chaves reais: `Coordenador` (além de `Coordenação`), `Acesso`, `Data`, `Local`, `Solicitante`, `Cliente`, `Supervisor`, `Equipe`, `Escopo`, `Embarcação`.
- Fallback para orientações de uma linha no padrão `OS 5554 – equipamento – cliente – embarcação`: extrair número da OS e último segmento como candidato a embarcação (apenas quando bate com embarcação já cadastrada, para não criar lixo).
- Reprocessar as 1.921 tarefas já sincronizadas a partir do `raw_payload`, sem novas chamadas à API.
- Rodar a reconciliação para propagar embarcação, equipe, coordenador, local, escopo e datas para `service_orders`.

### 2. Ampliar a cobertura do Auvo
- Executar o `auvo-sync` na janela histórica que ainda falta, para que OSs do Omie sem projeto vinculado passem a ter dados operacionais.
- Após o sync, reconciliar novamente e medir quantas OSs continuam sem embarcação/coordenador — o que sobrar é dado que realmente não existe em nenhuma fonte, e a lista mostrará isso explicitamente em vez de "N/A" genérico.

### 3. Ordenação da lista por número da OS (decrescente)
- Coluna numérica derivada de `order_number` em `service_orders`, com índice, para ordenar corretamente no banco.
- `useServiceOrders` passa a ordenar por esse número em ordem decrescente (mais nova no topo), mantendo a paginação server-side e os filtros atuais.
- Cabeçalho da coluna "Número da OS" indica a ordenação aplicada.

### 4. Agenda — visão mensal
- Limitar os eventos visíveis por célula ao que cabe na altura da linha e adicionar uma última linha `+N` clicável.
- O clique abre o `DayEventsDialog` já existente com todas as atividades do dia; cada item abre o modal de detalhes dentro da agenda.

### 5. Agenda — visão semanal
- Preencher a coluna somente até o fim da altura visível da tela (sem transbordar abaixo do viewport) e reservar a última linha para o `+N` clicável.
- Cálculo do número de itens visíveis por altura medida da coluna, em vez do corte fixo de 18, recalculado no resize.
- Ausências e sobreavisos continuam sempre visíveis; a contagem `+N` cobre as OSs excedentes.

## Detalhes técnicos

- **Migração/SQL:** atualizar `parse_auvo_orientation` (aceitar `[:;]`), atualizar `reconcile_service_orders_from_auvo` para as novas chaves, adicionar coluna numérica de OS em `service_orders` com índice; backfill dos campos parseados em `auvo_tasks` a partir de `raw_payload`. Nenhuma tabela nova.
- **Edge Functions:** `supabase/functions/auvo-sync/auvo.ts` (`parseOrientation` com separador flexível, novas chaves, fallback de linha única) e `auvo-sync/index.ts` (gravação dos campos e modo de reprocessamento local).
- **Frontend:** `src/hooks/useServiceOrders.ts` (ordenação), `src/pages/admin/ServiceOrders.tsx` (cabeçalho), `src/components/admin/calendar/MonthView.tsx` (limite + `+N`), `WeekView.tsx` (altura medida + `+N`), reuso de `DayEventsDialog` e do modal local de detalhes.

## Validação

1. Lista de OSs abre com a OS de maior número no topo e a paginação continua coerente.
2. Contagem de OSs com embarcação e coordenador sobe substancialmente após o reprocessamento (hoje 482 e 828 de 4.972).
3. Visão mensal: dias cheios mostram `+N` clicável e o diálogo lista todas as atividades.
4. Visão semanal: nenhuma coluna passa do fim da tela; excedente aparece como `+N` clicável na última linha.
5. Clique em qualquer item continua abrindo os detalhes dentro da agenda.
