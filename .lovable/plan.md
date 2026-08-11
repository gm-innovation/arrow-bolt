# Atualização automática dos valores das oportunidades

## Problema

Quando a alteração vem de fora da tela (Marina/IA, outro usuário, integração), a interface não recebe aviso nenhum: o valor no cabeçalho da oportunidade e no card do Kanban continuam mostrando o número antigo (R$ 8.425,20 / R$ 8,4 mil) mesmo com apenas 1 item de R$ 4.212,60 na aba Itens.

Duas causas confirmadas:

1. As tabelas de oportunidades e de itens de oportunidade **não estão publicadas em tempo real** no banco, então o navegador nunca é notificado de mudanças feitas pelo servidor.
2. Os painéis (detalhe e edição) exibem o objeto da oportunidade **capturado no momento em que foram abertos**. Mesmo quando a lista é recarregada, o painel aberto continua mostrando o valor antigo.

## O que será feito

1. **Ligar atualização em tempo real** para oportunidades e itens de oportunidade no banco.
2. **Escutar essas mudanças no app** e recarregar automaticamente: lista/Kanban, cabeçalho da oportunidade, aba Itens e os indicadores do painel comercial (Valor Total, Idade Média, totais por estágio).
3. **Painéis abertos passam a ler sempre a versão mais recente** da oportunidade em vez do objeto congelado na abertura — o valor no cabeçalho muda na hora em que um item é adicionado, alterado ou removido, sem precisar fechar e abrir de novo nem recarregar a página.
4. Manter o comportamento atual de recálculo pelo banco como fonte única do valor estimado, para que interface e IA nunca divirjam.

## Detalhes técnicos

- Migração: `ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_opportunities, public.crm_opportunity_products;` (RLS já existente permanece controlando quem recebe cada linha).
- Novo hook `useOpportunitiesRealtime` (canal único, criado em `useEffect` com `supabase.removeChannel` no cleanup) invalidando as query keys `crm-opportunities`, `crm-opportunity-products`, `commercial-stats` e `crm-opportunity` (nova).
- Montar o hook nas telas que consomem esses dados: `src/pages/commercial/Opportunities.tsx`, `src/pages/commercial/Dashboard.tsx` e `src/pages/admin/Leads.tsx` (aba de oportunidades de serviço).
- `useOpportunities.ts`: expor `useOpportunity(id)` (query key `["crm-opportunity", id]`).
- `OpportunityDetails.tsx` e `EditOpportunitySheet.tsx`: usar `useOpportunity(opportunity.id)` com o prop como `initialData`/fallback, e derivar o cabeçalho dessa versão fresca; no `EditOpportunitySheet` sincronizar apenas o campo de valor quando o formulário não estiver com edição pendente, para não sobrescrever digitação do usuário.
- Nenhuma mudança na lógica de cálculo: continua valendo o trigger `crm_sync_opportunity_estimated_value`.
