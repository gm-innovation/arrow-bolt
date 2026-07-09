## Objetivo
1. Dar visibilidade completa (somente leitura) de OSs, medições e vendas para Comercial/Marketing.
2. Unificar Serviços (medições) + Produtos (`crm_sales`) numa única página `/commercial/sales`.
3. Criar o Painel de Inteligência (IA) do Comercial/Marketing em `/commercial/ai-insights`, alimentado por OSs, vendas, oportunidades e leads.

## Onda 1 — RLS (backend)
Adicionar políticas SELECT para `commercial` e `marketing` (escopo `company_id = user_company_id(auth.uid())`) em:
- `service_orders`, `os_materials`, `service_visits`, `visit_technicians`, `service_history`
- `measurements` e sub-tabelas (materials/services/man_hours/travels/expenses) — validar
- `crm_sales`, `crm_sale_items` — validar (marketing precisa SELECT)

Edição continua restrita pelas policies existentes (dono/coordenador/diretor/super_admin).

## Onda 2 — Página unificada `/commercial/sales`
- Nova página `src/pages/commercial/Sales.tsx` com abas:
  - **Serviços** — tabela de medições atual (já usa `MeasurementDialog` completo do coordenador, `readOnly` quando não é dono).
  - **Produtos** — tabela de `crm_sales` (cliente, número, status, total, itens), abrindo modal de detalhes com itens e vínculo à oportunidade.
- Rota `/commercial/sales` no `App.tsx` (papéis `commercial`, `marketing`); redirecionar `/commercial/measurements` → `/commercial/sales?tab=servicos`.
- Sidebar: substituir "Medições" por "Vendas".
- Deletar `src/pages/commercial/Measurements.tsx` após migração.

## Onda 3 — Painel de IA `/commercial/ai-insights`
- Nova página + item no sidebar ("Inteligência").
- Cards de KPI: total vendido (serviços+produtos), ticket médio, clientes em risco de churn, oportunidades de recorrência vencendo.
- Seções alimentadas por Edge Function `commercial-ai-insights` (Lovable AI Gateway, modelo `google/gemini-2.5-flash`):
  1. **Recuperação de clientes** — lista clientes sem compra/OS há N dias com sugestão de abordagem.
  2. **Recorrências previstas** — cruza `crm_client_recurrences` + histórico de OS para prever próximas janelas.
  3. **Recomendações de upsell/cross-sell** — baseado em produtos/serviços já consumidos.
  4. **Resumo do pipeline** — narrativa das oportunidades abertas e ações sugeridas.
- Edge Function lê OSs, medições, vendas, oportunidades e leads da empresa (via service_role) e devolve JSON estruturado; a UI renderiza cards + botão "Gerar ação" (cria `crm_task` para o comercial).
- Todos os insights são registrados em `ai_proactive_alerts` (tabela já existente) para histórico e feed.

## Detalhes técnicos
- RLS: uma migração por onda, seguindo padrão de política já existente com `has_role`.
- Modal do coordenador (`MeasurementDialog`) já suporta `readOnly`.
- Modal de venda de produto: novo `SaleDetailDialog` reutilizando o padrão do coordenador (`src/pages/manager` não tem equivalente hoje — criar leve, exibindo `crm_sale_items`).
- IA: Edge Function `supabase/functions/commercial-ai-insights/index.ts` com CORS, `verify_jwt=true`, secret `LOVABLE_API_KEY`.

## Fora do escopo
- Alterar regras de edição de OS/medição/venda.
- Chat conversacional com IA (a resposta foi "painel de insights", não chat).

## Ordem de execução
Onda 1 (RLS) → Onda 2 (Vendas) → Onda 3 (IA). Confirmar após cada onda antes da próxima.