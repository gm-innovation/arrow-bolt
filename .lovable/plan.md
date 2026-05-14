## Lista de clientes — seleção em massa, ações em lote e flag "ignorar no Omie"

Restrito ao papel **Coordenador** (e `super_admin`). Os botões/coluna nem renderizam para outros papéis.

### 1. Caixas de marcação

Em `src/components/commercial/clients/ClientsTable.tsx`:
- Checkbox por linha (já existe — manter).
- Checkbox **"Marcar todos"** no header com 3 estados (vazio / parcial / cheio) — seleciona todos os **filtrados** (não só visíveis na página).
- Barra fixa acima da tabela quando há seleção:
  > `12 selecionados — [Marcar todos os 47 filtrados] [Limpar seleção]`

### 2. Seletor de ação em massa

Acima da tabela (visível só para Coordenador), `Select "Ações em massa"` desabilitado quando nada está marcado, com:

- **Excluir selecionados** — `AlertDialog` + `delete().in('id', batch)` em lotes de 100.
- **Ignorar na próxima sincronização do Omie** *(ver item 4)*.
- **Marcar como Inativo / Prospect / Ativo / Perdido** — atualiza `commercial_status`.
- **Exportar selecionados (CSV)**.

Botão **"Aplicar"** ao lado dispara a ação com confirmação.

### 3. Lixeira por linha

Ícone `Trash2` discreto na coluna Ações (só Coordenador), com `AlertDialog`. Atende exclusão pontual sem precisar marcar.

### 4. Flag "Ignorar no Omie" (fracionando o plano)

**4a. Migração** — adicionar coluna em `public.clients`:
```sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS ignore_omie_sync boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_clients_ignore_omie_sync
  ON public.clients (company_id, ignore_omie_sync) WHERE ignore_omie_sync = true;
```

**4b. Sincronização do Omie** — em `useOmieIntegration.ts` (e/ou na edge function `omie-proxy` que faz upsert de clientes), antes de inserir/atualizar checar:
- Se já existe um `clients.id` com mesmo `omie_client_id` **e** `ignore_omie_sync = true` → **pular** (não recriar, não reativar).
- Novos clientes do Omie cuja CNPJ corresponda a um já marcado como ignorado também são pulados.

**4c. UI** — ação em massa "Ignorar no Omie" faz `update({ ignore_omie_sync: true })` nos selecionados; badge cinza **"Omie ignorado"** aparece na linha. Toggle inverso disponível na ação em massa ("Voltar a sincronizar com Omie").

**4d. Exclusão + ignorar (combinada)** — quando o Coordenador escolher **Excluir** clientes vindos do Omie, oferecer no `AlertDialog` um checkbox marcado por padrão:
> ☑ *"Marcar também para ignorar nas próximas sincronizações do Omie (impede que voltem)"*
>
> Como `delete` apaga o registro, o ignorar precisa de um destino. Vou criar uma tabela leve `public.omie_sync_blocklist (company_id, omie_client_id, cnpj, blocked_at, blocked_by)` consultada pela sync para não recriar.

```sql
CREATE TABLE public.omie_sync_blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  omie_client_id text,
  cnpj text,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  blocked_by uuid REFERENCES auth.users(id)
);
CREATE INDEX ON public.omie_sync_blocklist (company_id, omie_client_id);
CREATE INDEX ON public.omie_sync_blocklist (company_id, cnpj);
ALTER TABLE public.omie_sync_blocklist ENABLE ROW LEVEL SECURITY;
-- Policies: select/insert/delete restritos a coordinator/super_admin da mesma company_id (has_role + company_id match).
```

A sync passa a checar **ambos**: `clients.ignore_omie_sync` (cliente preservado mas estável) e `omie_sync_blocklist` (cliente excluído que não deve voltar).

### 5. Lógica de exclusão segura

`deleteMutation` em `src/pages/commercial/Clients.tsx`:
- Lotes de 100 com `delete().in('id', batch)`.
- Se houver FK de OS/oportunidades/embarcações, captura erro e mostra toast:
  > *"3 clientes não puderam ser excluídos por terem registros vinculados. Os demais foram removidos."*
- Se o checkbox "ignorar no Omie" estiver marcado, faz `insert` em `omie_sync_blocklist` antes do delete.

`bulkUpdateStatusMutation` para os status em massa (mesmo padrão).

### 6. Filtro auxiliar

Adicionar coluna/badge **"Origem"** (Omie / Manual) — derivado de `omie_client_id IS NOT NULL` — e filtro no topo, para localizar e marcar em massa os 2.558 importados do Omie.

### Permissão (resumo)

| Ação | Coordinator | Super Admin | Outros |
|---|---|---|---|
| Ver checkboxes / lixeira / Select de ações | ✅ | ✅ | ❌ |
| Excluir / mudar status em massa | ✅ | ✅ | ❌ |
| Marcar `ignore_omie_sync` / blocklist | ✅ | ✅ | ❌ |

RLS das tabelas continua como está; a UI esconde os controles via `userRole`.

### Arquivos afetados

- **Migração:** `clients.ignore_omie_sync` + tabela `omie_sync_blocklist` + RLS.
- `src/components/commercial/clients/ClientsTable.tsx` — checkboxes, lixeira por linha, badges (Origem / Omie ignorado), filtro de Origem.
- `src/pages/commercial/Clients.tsx` — barra de seleção, Select de ações em massa, mutations.
- `src/hooks/useOmieIntegration.ts` *(e/ou)* `supabase/functions/omie-proxy/index.ts` — checar `ignore_omie_sync` e `omie_sync_blocklist` antes de upsert.

### Fora de escopo

- Não vou criar tipos "Fornecedor / Funcionário / Cliente" agora.
- Não vou alterar o agendamento da sync, só o filtro de upsert.
- Sem CASCADE em FKs.
