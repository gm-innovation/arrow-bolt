## Objetivo
Substituir os 4 KPIs de leads do topo do Dashboard do Coordenador (`/admin/dashboard`) pelo mesmo padrão usado no Comercial/Marketing: **Leads novos**, **Em contato**, **Convertidos (30d)**, **Descartados (30d)** — cada card clicável leva à aba de Leads correspondente.

## Escopo
Apenas UI. Sem mexer em banco, RLS ou lógica de negócio.

## Mudanças

### 1. `src/components/admin/dashboard/CrmDashboardCards.tsx`
- Remover o bloco atual dos 4 KPIs (leadsNew 7d / Sem responsável / Oportunidades abertas / Convertidos no mês) e a computação `stats` correspondente.
- Renderizar no lugar um novo componente de KPIs de leads seguindo o mesmo layout, ícones, cores e comportamento de `LeadsKpiCards.tsx` do Comercial (Sparkles / PhoneCall / CheckCircle2 / XCircle; cards clicáveis com `Link`).
- Manter os dois cartões inferiores ("Últimos leads" e "Oportunidades em aberto") intactos.
- Segmentação: seguir o padrão do coordenador (`segment in ('service','unknown')`) via `public_site_leads` — não usar `useSiteLeads` (que puxa todos os segmentos e é focado no Comercial), preservando a segmentação de serviço do módulo de coordenação.
- Os cards linkam para `/admin/leads?status=new|reviewed|converted|discarded` (mesma UX do Comercial, com querystring de status, mas apontando para a rota de admin).

### 2. Sem alterações em rotas, hooks compartilhados, ou no dashboard do Comercial.

## Detalhes técnicos
- Cálculo dos KPIs: reaproveitar a lógica de `LeadsKpiCards` (contagem por `status`, janelas de 30 dias via `differenceInDays` de `date-fns`) sobre o resultado do fetch já existente em `CrmDashboardCards` (adicionar uma query auxiliar leve para trazer `status, created_at, converted_at` limitados a `segment in ('service','unknown')`).
- Estados de loading exibem "…" nos cards, como no Comercial.
- Tokens/cores: usar as mesmas classes semânticas do `LeadsKpiCards` (`text-primary`, `text-blue-600 dark:text-blue-400`, etc.), sem cores hard-coded fora do padrão.

## Verificação
- Abrir `/admin/dashboard` como coordenador e confirmar os 4 novos cards no topo.
- Clicar em cada card e validar que abre `/admin/leads` com o filtro de status aplicado.
- Confirmar que "Últimos leads" e "Oportunidades em aberto" continuam funcionando.
