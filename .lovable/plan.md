## Objetivo

1. Substituir o card grande "Leads recentes" por **KPI cards simplificados** no dashboard.
2. **Trazer os Leads do Site para dentro de Oportunidades**, tanto no Kanban quanto em uma aba dedicada com tabela detalhada.

---

## Como os leads entram no Kanban

`crm_opportunities.client_id` é **NOT NULL**, então um lead do site não pode virar uma oportunidade real automaticamente (não tem cliente ainda). Solução:

- Adiciono uma **coluna virtual "Leads" à esquerda do Kanban** que exibe os registros de `public_site_leads` com status `new`/`contacted`, sem criar linhas em `crm_opportunities`.
- Cada card de lead tem cor/borda diferente e um botão **"Converter"**.
- A conversão abre um modal que:
  1. Cria (ou vincula a) um cliente na tabela `clients` — se o e-mail/telefone bater com um cliente existente, oferece vincular; senão, cria um novo já com nome, e-mail, telefone (e CNPJ, se informado, com nossa nova busca).
  2. Cria a oportunidade em `crm_opportunities` com stage `qualified`, título vindo do lead, valor estimado e descrição pré-preenchidos.
  3. Marca o lead como `converted` e grava `converted_opportunity_id` — o card some da coluna "Leads" e aparece como oportunidade real na coluna "Qualificado".
- Ao arrastar um card da coluna "Leads" para qualquer coluna real do Kanban, dispara o mesmo modal de conversão.

Resultado: **o Comercial vê tudo em um único Kanban** — leads crus à esquerda, oportunidades qualificadas nas colunas seguintes.

---

## 1) Dashboard Comercial — mini-cards

Substituir o `LeadsHighlightCard` atual por uma linha de **4 mini-cards clicáveis** (mesmo padrão dos KPIs existentes):

| Card | Regra | Ao clicar |
| --- | --- | --- |
| **Leads Novos** | `status = 'new'` | `/commercial/opportunities?tab=leads&status=new` |
| **Em contato** | `status IN ('contacted','qualified')` e ainda não convertido | idem `status=contacted` |
| **Convertidos (30d)** | `status = 'converted'` e `converted_at` nos últimos 30 dias | idem `status=converted` |
| **Perdidos (30d)** | `status = 'lost'` últimos 30 dias | idem `status=lost` |

---

## 2) Oportunidades — Kanban + aba "Leads do Site"

`/commercial/opportunities` passa a ter duas abas:

### Aba "Kanban" (padrão)
- Coluna virtual **"Leads"** (nova, à esquerda) → cards de `public_site_leads` não-convertidos.
- Colunas atuais do pipeline → inalteradas.
- Botão **Converter** no card de lead ou arrastar para direita → modal de conversão descrito acima.

### Aba "Leads do Site"
- Tabela detalhada com todos os campos do lead, filtros por status/origem/período e busca por texto.
- Ações por linha: **Converter**, **Marcar em contato**, **Marcar perdido**, **Ver detalhes** (drawer).

---

## Menu / Rotas

- Remover o item **"Leads do Site"** do sidebar da Comercial e do Marketing.
- `/commercial/site-leads` continua respondendo (redireciona para `/commercial/opportunities?tab=leads`) para não quebrar links antigos e a trigger de notificação in-app.

---

## Arquivos afetados

**Novos**
- `src/components/commercial/dashboard/LeadsKpiCards.tsx`
- `src/components/commercial/opportunities/LeadsColumn.tsx` (coluna virtual do Kanban)
- `src/components/commercial/opportunities/SiteLeadsTab.tsx` (tabela detalhada)
- `src/components/commercial/opportunities/ConvertLeadDialog.tsx` (modal cliente + oportunidade)
- `src/hooks/useSiteLeads.ts` (query + mutations: mark status, convert)

**Editados**
- `src/pages/commercial/Dashboard.tsx` — troca card grande por `LeadsKpiCards`.
- `src/pages/commercial/Opportunities.tsx` — envolve em `<Tabs>`, adiciona coluna "Leads" no Kanban.
- `src/pages/commercial/SiteLeads.tsx` — redirect para nova localização.
- Sidebar / rotas do App — remove item de menu.

**Removido**
- `src/components/commercial/dashboard/LeadsHighlightCard.tsx`

Sem novas migrações — todo o comportamento reusa `public_site_leads.status` e `converted_opportunity_id` que já existem.