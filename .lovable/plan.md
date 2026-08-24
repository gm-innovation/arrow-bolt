# Plano: Enriquecimento real das OSs — parser do Auvo + correção dos campos do Omie

## Diagnóstico (confirmado no banco nesta sessão)

1. **Embarcação N/A (4.188 de 4.593 OSs)**: o auvo-sync grava `vessel_name = customerDescription`, mas esse campo às vezes é o cliente (ex.: OS 4404 → "GOOGLEMARINE"). A embarcação real está no **texto estruturado de `orientation`**: 549 tarefas têm "Embarcação; ..." e 572 têm Equipe, Local, Supervisor, Solicitante e Escopo. O `raw_payload` já está salvo no banco — dá para reprocessar tudo sem chamar a API do Auvo.
2. **Coordenador N/A (4.580 OSs)**: `created_by` é nulo nas OSs espelhadas do Omie. Mas o Auvo informa quem criou a tarefa (`userFromName`, ex.: "Priscila") e, em alguns casos, "Coordenação; ..." no texto.
3. **Abertura errada (24/08/2026 em todas)**: `omie_created_date` está nulo nas 4.593 OSs. O último omie-sync rodou com `values_enriched: 0` e sem erros — ou seja, os campos `dDtIncReg`/`nValorTotal` não estão nos caminhos esperados da resposta do Omie. É preciso sondar o payload real para mapear os nomes corretos.
4. **Cobertura Auvo incompleta**: só existem tarefas de Jan, Fev e Mai–Ago/2026 (1.328). A janela padrão do sync é o ano corrente; OSs executadas em 2025 e os meses de Mar/Abr ficaram de fora.
5. **457 OSs do Omie nem entram no sistema**: cliente Omie sem correspondente cadastrado — ficam puladas a cada sync.

## Etapa 1 — Parser do texto de orientação do Auvo

- Nova função `parseOrientation` no auvo-sync: extrai pares "Chave; Valor" (OS, Embarcação, Equipe, Data, Local, Solicitante, Cliente, Supervisor, Coordenação, Escopo).
- Novas colunas em `auvo_tasks`: `vessel_name_parsed`, `team_name`, `requester_name`, `supervisor_name`, `coordinator_name`, `location_text`, `scope_text`, `scheduler_name` (de `userFromName`).
- Reprocessamento das 1.328 tarefas já sincronizadas a partir do `raw_payload` (sem nova chamada à API); sync passa a gravar os campos parseados daqui em diante.

## Etapa 2 — Reconciliação v2 (Auvo → service_orders)

- `vessel_id`: match normalizado do nome parseado; quando não existir, **auto-cadastro da embarcação** no cliente da OS (com normalização para não duplicar "AH VALLETTA" / "AH Valletta").
- Nova coluna `coordinator_name` em `service_orders`: preenchida com o Coordenação/userFromName do Auvo; quando o nome bater com um perfil, vincula também em `created_by` se estiver nulo.
- `location` ← Local parseado; `description` ← Escopo; `scheduled_date` ← "Data" do texto ou primeira `task_date`.
- Backfill único sobre tudo que já está vinculado (1.135 tarefas).

## Etapa 3 — Backfill da janela do Auvo

- Uma execução manual do auvo-sync com `period_start` em 2025 (blocos mensais já suportados) para cobrir OSs antigas e os meses faltantes (Mar/Abr).
- Reconciliação roda automaticamente ao final, preenchendo as OSs recém-vinculadas.

## Etapa 4 — Omie: sondar o payload real e corrigir abertura/valor

- Novo modo `probe` no omie-sync que devolve 1 linha crua do `ListarOS` e 1 do `ConsultarOS` para descobrir os nomes reais dos campos de data de abertura e valor total.
- Corrigir o mapeamento e rodar backfill: OSs abertas/em andamento primeiro, histórico em lotes nos ciclos do cron.
- Fallback de abertura: quando o Omie não tiver a data, usar `creationDate` da tarefa Auvo mais antiga da OS (em vez de fingir a data da importação).

## Etapa 5 — Ajustes de exibição

- Lista de OSs: coluna Coordenador mostra `coordinator_name` (Auvo) quando `created_by` for nulo; coluna Abertura usa omie_created_date → 1ª tarefa Auvo → created_at (nesta ordem, sem datas fictícias).
- Detalhe da OS: nova seção "Dados operacionais (Auvo)" com embarcação, equipe, supervisor, coordenação, solicitante, local e escopo.
- Calendário e dashboard passam a exibir embarcação automaticamente conforme a Etapa 2 preenche.

## Etapa 6 (opcional, sob confirmação) — Destravar as 457 OSs puladas

- Mapear clientes Omie ↔ Arrow (por CNPJ/nome) e, onde não houver correspondente, criar o cliente automaticamente para que nenhuma OS do Omie fique de fora.

## Detalhes técnicos

- **Migração SQL**: colunas novas em `auvo_tasks` e `service_orders` (`coordinator_name`); atualização da `reconcile_service_orders_from_auvo`; sem tabelas novas (GRANTs/RLS não se aplicam).
- **Edge Functions**: `supabase/functions/auvo-sync/auvo.ts` (parser `parseOrientation`), `auvo-sync/index.ts` (gravar campos parseados + modo de reprocessamento local), `omie-sync/index.ts` (modo `probe`, mapeamento corrigido, backfill em lotes com backoff).
- **Frontend**: `src/hooks/useServiceOrders.ts` (selecionar `coordinator_name`, ordenação de fallbacks de abertura), `src/pages/admin/ServiceOrders.tsx` (colunas Coordenador/Abertura), `src/components/admin/orders/ViewOrderDetailsDialog.tsx` (seção Auvo).
- **Backfills** executados via run_sql sobre `raw_payload` e uma invocação manual do auvo-sync com janela 2025→hoje; nada disso exige varredura completa das APIs externas além da janela histórica do Auvo.
- Parser tolerante: linhas "Chave; Valor", case/acentos ignorados; tarefas sem o padrão (ex.: ausências) ficam como estão.
