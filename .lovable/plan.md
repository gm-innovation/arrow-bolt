
# CRM de Serviços para Coordenadores

## Objetivo

Dar aos coordenadores um CRM focado em **serviços** (e produtos atrelados a serviço), espelhando a lógica do CRM Comercial, mas dentro da área `/admin`. Marketing/Comercial continuam donos de venda de produto e e-commerce; coordenadores tratam de demanda de serviço técnico (RFQs, contatos, indicações) até virar OS.

A base de dados de leads e oportunidades é **compartilhada** com o Comercial — separação se dá por **segmento** (`service` vs `product`) e por **responsável** (`assigned_to`).

## Escopo desta entrega

1. **Leads compartilhados com segmentação**
   - Adicionar coluna `segment` em `public_site_leads` (`service` | `product` | `unknown`, default `unknown`).
   - Adicionar `assigned_to uuid` em `public_site_leads` para responsável.
   - Form do site continua entrando como `unknown`; coordenador/comercial classifica ao revisar.
   - RLS: coordenadores veem leads da empresa onde `segment = 'service'` OU `assigned_to = auth.uid()`; comerciais veem `segment = 'product'` OU `assigned_to = auth.uid()`. Diretor/Admin veem tudo.

2. **Página `/admin/leads`**
   - Reaproveitamento estrutural de `src/pages/commercial/SiteLeads.tsx` (tabela + dialog).
   - Fontes adicionais de origem do lead via campo `source` (já existente ou criar enum: `site_rfq`, `site_contact`, `whatsapp`, `phone`, `client_referral`, `import`).
   - Botão **"Novo lead manual"** (WhatsApp / telefone / indicação) com formulário simples.
   - Botão **"Importar"** (CSV/planilha) — fluxo básico de upload + parse client-side com mapeamento de colunas.
   - Filtros: status, origem, responsável (eu / todos), período.
   - Conversão em **Oportunidade de Serviço** (reusa `crm_opportunities` com `opportunity_type = 'service'` ou nova flag `segment`).

3. **Página `/admin/opportunities`**
   - Pipeline kanban simples (qualified → proposal → negotiation → won/lost) reusando `crm_opportunities` filtrado por `segment = 'service'`.
   - Ao ganhar oportunidade: botão **"Gerar OS"** abre o `NewOrderDialog` já preenchido (cliente, contato, descrição, produtos sugeridos).
   - Vínculo opcional `crm_opportunities.service_order_id` (nova coluna).

4. **Dashboard `/admin/dashboard` — bloco CRM**
   - Novos cards no topo (acima da agenda):
     - Leads novos (últimos 7 dias)
     - Leads sem responsável
     - Oportunidades de serviço abertas + valor estimado total
     - Conversão lead → OS (mês atual)
   - Lista compacta "Últimos leads" com link para `/admin/leads`.
   - Lista "Oportunidades para fechar esta semana".
   - Mantém Stats / Calendário / Charts atuais abaixo.

5. **Navegação**
   - Sidebar admin ganha grupo **"CRM"** com itens: Leads, Oportunidades, Clientes (já existe).

6. **Captura de origem extra**
   - Marcar `source = 'whatsapp'` quando lead vier do webhook WhatsApp (já existe `whatsapp-webhook`) — apenas estender payload para inserir em `public_site_leads`.

## Fora do escopo (próximas conversas)
- E-commerce / catálogo público de produtos.
- IA de qualificação automática de leads.
- Funil/forecast avançado para serviços.
- Integração Omie de leads (só placeholder de import por planilha agora).

## Detalhes técnicos

### Migração SQL
```sql
-- public_site_leads
alter table public.public_site_leads
  add column if not exists segment text not null default 'unknown'
    check (segment in ('service','product','unknown')),
  add column if not exists assigned_to uuid references auth.users(id),
  add column if not exists source text not null default 'site_rfq';

create index if not exists idx_leads_segment on public.public_site_leads(segment);
create index if not exists idx_leads_assigned on public.public_site_leads(assigned_to);

-- crm_opportunities
alter table public.crm_opportunities
  add column if not exists segment text not null default 'product'
    check (segment in ('service','product')),
  add column if not exists service_order_id uuid references public.service_orders(id);

create index if not exists idx_opps_segment on public.crm_opportunities(segment);
```

### RLS (esboço)
- `public_site_leads` SELECT: `company_id = current_company()` AND (
    `has_role(auth.uid(),'director'|'admin'|'super_admin')`
    OR (`has_role(auth.uid(),'coordinator')` AND (`segment IN ('service','unknown')` OR `assigned_to = auth.uid()`))
    OR (`has_role(auth.uid(),'commercial')` AND (`segment IN ('product','unknown')` OR `assigned_to = auth.uid()`))
  )
- UPDATE: mesmas regras.

### Estrutura de arquivos
```text
src/pages/admin/
  Leads.tsx              (nova — espelha SiteLeads.tsx)
  Opportunities.tsx      (nova — kanban simples)
src/components/admin/crm/
  NewLeadDialog.tsx
  ImportLeadsDialog.tsx
  ConvertLeadToServiceOppDialog.tsx
  CrmDashboardCards.tsx  (cards no Dashboard.tsx)
src/hooks/
  useServiceLeads.ts
  useServiceOpportunities.ts
```

### Rotas (App.tsx, dentro do bloco coordinator)
```text
/admin/leads           → Leads
/admin/opportunities   → Opportunities (CRM serviços)
```

### Dashboard
- Editar `src/pages/admin/Dashboard.tsx` para inserir `<CrmDashboardCards />` antes de `<DashboardStats />`.

## Validação
- Coordenador logado vê leads `service`/`unknown` da empresa; não vê `product` de outros.
- Comercial não enxerga leads marcados como `service`.
- Converter lead → cria oportunidade `segment='service'` → "Gerar OS" abre `NewOrderDialog` com dados preenchidos.
- Dashboard mostra contagens corretas após criar/converter leads de teste.
