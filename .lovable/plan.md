# Coordenadores enxergarem todos os leads do site

## Causa
A política SELECT de `public_site_leads` filtra coordenadores a leads de segmento `service`/`unknown`, atribuídos a eles, ou convertidos. Leads gerados pelo site normalmente entram como `product` (Proposta/RFQ), então a lista aparece vazia para a coordenação.

## Correção

Migration ajustando as políticas SELECT e UPDATE de `public_site_leads`:

- **SELECT**: coordinator/manager/admin passam a ver **todos os leads da própria empresa**, igual a director e commercial/marketing (mantém filtro por `company_id` e super_admin global).
- **UPDATE**: mesma flexibilização — coordinator/manager/admin podem atualizar qualquer lead da empresa (necessário para converter, atribuir, descartar).
- INSERT permanece como está (formulário público).

Sem mudança de schema, dados ou UI — só RLS. Depois disso a aba "Leads do Site" em `/admin/opportunities` mostra os 6 leads visíveis pelo comercial.

## Verificação
- Rodar `SELECT count(*) FROM public_site_leads` como coordenador e confirmar paridade com o comercial.
- Abrir `/admin/opportunities?tab=leads` autenticado como coordenador.

Posso aplicar?
