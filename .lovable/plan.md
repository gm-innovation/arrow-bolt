## Objetivo
Permitir que coordenadores enxerguem leads convertidos pelo Comercial/Marketing (segment `product`), além dos já visíveis (`service`/`unknown`/atribuídos a si).

## Mudanças

### 1. RLS de `public_site_leads`
Atualizar as policies SELECT e UPDATE para coordenadores:
- Manter: `segment IN ('service','unknown')` ou `assigned_to = auth.uid()`
- **Adicionar**: `status = 'converted'` (qualquer segmento) — coordenadores veem leads já convertidos pelo Comercial/Marketing para acompanhar o que virou oportunidade.

Comercial/Marketing continua igual (vê `product`/`unknown` e atribuídos).

### 2. UI em `/admin/leads`
- Adicionar badge/coluna indicando origem do segmento (Serviço, Produto, Indefinido) para coordenador identificar leads que vieram do outro time.
- Filtro extra "Apenas convertidos" para revisar oportunidades originadas no Comercial.
- Leads `product` convertidos aparecem em modo somente-leitura para coordenador (sem botão converter/editar status), apenas visualização e link para a oportunidade.

### Fora de escopo
- Não muda regra do Comercial.
- Não cria nova tabela nem novos campos.
- Não altera `crm_opportunities` (já visível se segment compatível).

## Arquivos
- Nova migration: ajusta policies SELECT/UPDATE de `public_site_leads`.
- `src/pages/admin/Leads.tsx`: badge de segmento, filtro convertidos, bloqueio de ações em leads `product`.
