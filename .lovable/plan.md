**Causa:** ao converter lead em oportunidade, gravamos `stage: "qualification"`, mas o kanban e o filtro de estágios usam o id `qualified`. Resultado: a oportunidade existe mas não cai em nenhuma coluna.

**Correção:**

1. Em `src/pages/commercial/SiteLeads.tsx` (função `submit` do `ConvertLeadDialog`), trocar `stage: "qualification"` por `stage: "qualified"`.

2. Migração leve para corrigir registros já convertidos: `UPDATE crm_opportunities SET stage = 'qualified' WHERE stage = 'qualification';` (escopo só da empresa atual via condição padrão; se o enum/coluna for texto livre basta o update direto).

Sem outras mudanças — manter labels, cores e fluxo existentes.