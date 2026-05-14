## Diagnóstico

A implementação anterior foi feita em `src/pages/commercial/Clients.tsx` (rota comercial). Porém você está em **`/admin/clients`**, que renderiza outro arquivo: **`src/pages/admin/Clients.tsx`** — ele tem sua própria UI (botões "Visualizar / Histórico / Editar / Lixeira" que aparecem na sua tela). Por isso a barra de ações em massa, o filtro de Origem e a opção de ignorar no Omie não aparecem para você, mesmo logado como Coordenador.

A migração de banco (`clients.ignore_omie_sync` + tabela `omie_sync_blocklist`) e o filtro na sync da edge function `omie-proxy` **já estão prontos** e continuam valendo.

## O que vou aplicar em `src/pages/admin/Clients.tsx`

### 1. Barra de ações em massa (só Coordenador / Super Admin)

Aparece acima da lista quando há clientes marcados:

> `12 selecionado(s)  [Limpar]   [Ações em massa ▾]  [Aplicar]`

Opções do `Select`:
- Marcar como **Ativo / Prospect / Inativo / Perdido** (atualiza `commercial_status`).
- **Ignorar na sincronização do Omie** (`ignore_omie_sync = true`).
- **Voltar a sincronizar com Omie** (`ignore_omie_sync = false`).
- **Excluir selecionados** — `AlertDialog` com checkbox marcado por padrão *"Marcar também para ignorar nas próximas sincronizações do Omie"* quando há clientes vindos do Omie. Insere em `omie_sync_blocklist` antes do `delete`.

Execução em lotes (100 para delete, 200 para update) com toast resumindo sucesso/falhas (FK de OS, oportunidades, embarcações).

### 2. Filtro e badge de Origem

- Novo `Select` no topo: **Origem = Todas / Manual / Omie / Omie ignorado** (derivado de `omie_client_id` + `ignore_omie_sync`).
- Badge cinza **"Omie ignorado"** ao lado do nome quando `ignore_omie_sync = true`.

### 3. Permissão

`canManage = userRole === "coordinator" || userRole === "super_admin"`. Para outros papéis, a barra de ações em massa, o filtro de Origem e a coluna de exclusão em massa **não renderizam** (a lixeira individual existente continua como está hoje).

### 4. Mantém o que já existe

- Checkboxes de linha + "Agrupar / Desagrupar" continuam intactos.
- Lixeira individual atual permanece; ganha a mesma lógica de oferecer "ignorar no Omie" se o cliente tiver `omie_client_id`.

## Arquivos afetados

- `src/pages/admin/Clients.tsx` — barra de ações, filtro de Origem, badge, mutations de delete em lote, update em lote, blocklist.
- **Nada mais.** Banco, RLS e filtro do `omie-proxy` já estão prontos da rodada anterior.

## Fora de escopo

- Não vou tocar em `src/pages/commercial/Clients.tsx` (já está pronto e serve a outra rota).
- Sem mudança de tipos Cliente/Fornecedor/Funcionário, sem CASCADE, sem alterar o agendamento da sync.
