## Diagnóstico
Consultando o banco:
- 2 leads com `status='converted'` (Cahuã e Alexandre Silva).
- Apenas o de **Cahuã** tem `opportunity_id` preenchido. O de **Alexandre Silva** ficou com `opportunity_id = NULL` — provavelmente foi marcado como convertido em fluxo antigo, mas a oportunidade não chegou a ser criada (ou foi excluída). Por isso só 1 card aparece no kanban.

Além disso, o card no kanban **não tem ação de "Ver detalhes"** — só o `Select` de etapa e botões de OS, sem dialog com descrição/contato/origem.

## Mudanças

### 1. Reparar leads "órfãos"
Em `src/pages/admin/Leads.tsx`:
- Quando abrir um lead com `status='converted'` mas `opportunity_id=NULL`, mostrar aviso + botão **"Criar oportunidade agora"** (mesma lógica do `ConvertLeadDialog`). Funciona para coordenador desde que `segment` seja `service`/`unknown`.

### 2. Detalhes da oportunidade
Em `src/pages/admin/Opportunities.tsx`:
- Card vira clicável (botão "Ver detalhes" pequeno, ou clique no título) → abre `Dialog` com:
  - Título, descrição completa, cliente, valor estimado, segmento, etapa atual, datas (criação, fechamento, atribuído).
  - Link para o lead de origem (consulta `public_site_leads` por `opportunity_id`).
  - Link para a OS gerada (se existir).
  - Para `segment='product'`: tudo em modo somente leitura.

### Fora de escopo
- Não muda RLS (já liberado para coordenador).
- Não altera fluxo do Comercial.

## Arquivos
- `src/pages/admin/Opportunities.tsx` — adicionar dialog de detalhes.
- `src/pages/admin/Leads.tsx` — botão "Criar oportunidade agora" para leads convertidos sem `opportunity_id`.
