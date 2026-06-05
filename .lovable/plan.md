# Refatoração: Voz do Cliente — Aprovada

Unifica `/quality/satisfaction` + `/quality/complaints` em **`/quality/voice-of-customer`**.

## Backend (migration)
- Novo enum `complaint_kind` (`complaint` | `suggestion`).
- Coluna `kind public.complaint_kind NOT NULL DEFAULT 'complaint'` em `quality_complaints`.
- `quality_complaint_to_ncr()` passa a rejeitar registros com `kind='suggestion'`.

## Frontend
- **Criar** `src/pages/quality/VoiceOfCustomer.tsx` (container com 4 KPIs + Tabs: Visão Geral, Campanhas, Reclamações, Sugestões).
- **Criar** `src/components/quality/voc/OverviewTab.tsx`, `CampaignsTab.tsx`, `ComplaintsTab.tsx`, `SuggestionsTab.tsx` — reusam hooks `useSatisfactionCampaigns` e `useQualityComplaints`.
- **Atualizar** `useQualityComplaints` para aceitar/filtrar por `kind`.
- **Manter** `SatisfactionDetail.tsx` e `ComplaintDetail.tsx` (telas de detalhe seguem isoladas).
- **Remover** `src/pages/quality/Satisfaction.tsx` e `src/pages/quality/Complaints.tsx`.
- **`App.tsx`**: nova rota `/quality/voice-of-customer`; `/quality/satisfaction` e `/quality/complaints` redirecionam pra ela; detalhes seguem em `/quality/satisfaction/:id` e `/quality/complaints/:id`.
- **`DashboardLayout.tsx`**: remover os 2 itens; adicionar único item **"Voz do Cliente"** com ícone `MessagesSquare`.

Página pública `/satisfaction/r/:token` permanece intacta.
