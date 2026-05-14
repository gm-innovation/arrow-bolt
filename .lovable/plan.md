## Diagnóstico
A página `/admin/opportunities` não mostra nada porque:
1. **RLS** de `crm_opportunities` só dá acesso a `commercial`, `admin`, `manager` e `super_admin`. **Coordenadores não estão na lista** → nenhuma linha retorna mesmo se existir.
2. A query da página filtra `segment = 'service'`, mas oportunidades convertidas pelo Comercial/Marketing são salvas com `segment = 'product'`.

## Mudanças

### 1. RLS de `crm_opportunities` (migration)
Adicionar policies:
- **SELECT** para coordenadores e diretores: qualquer oportunidade da mesma `company_id`. Coordenador vê tudo (inclusive `product`) para acompanhar leads convertidos por outros times.
- **INSERT/UPDATE/DELETE** para coordenadores: apenas oportunidades com `segment IN ('service','unknown')` ou `assigned_to = auth.uid()`. Diretor: tudo.

### 2. `src/pages/admin/Opportunities.tsx`
- Remover filtro fixo `segment = 'service'`. Buscar `service`, `unknown` e `product`.
- Adicionar badge de segmento em cada card (Serviço / Indefinido / Produto).
- Filtro no topo: "Todos / Serviço / Indefinido / Produto" (default: Serviço+Indefinido).
- Cards de segmento `product` ficam **somente leitura**: sem `Select` de etapa, sem botão "Gerar OS"; mostra rótulo "Comercial/Marketing".

### Fora de escopo
- Não altera fluxo do Comercial.
- Não muda schema (apenas RLS).

## Arquivos
- Nova migration ajustando policies de `crm_opportunities`.
- `src/pages/admin/Opportunities.tsx`.
