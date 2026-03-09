

## Plano: Reestruturar cadastro de clientes

### Resumo
Permitir múltiplas razões sociais/CNPJs, múltiplos endereços, vincular contatos a embarcações, e adicionar botão de visualização na lista de clientes (admin).

### Mudanças no banco de dados

**Nova tabela `client_legal_entities`** — armazena razões sociais e CNPJs:
```
id, client_id (FK clients), legal_name, cnpj, is_primary, created_at, updated_at
```

**Nova tabela `client_addresses`** — múltiplos endereços:
```
id, client_id (FK clients), label (ex: "Sede", "Filial"), cep, street, street_number, city, state, complement, is_primary, created_at, updated_at
```

**Nova tabela `contact_vessel_links`** — vincula contatos a embarcações (N:N):
```
id, contact_id (FK client_contacts), vessel_id (FK vessels)
UNIQUE(contact_id, vessel_id)
```

**Coluna na `client_contacts`**: adicionar `is_general boolean DEFAULT true` (indica se é contato geral ou vinculado a embarcações específicas)

**Campo `clients.name`**: passa a ser o "Nome Fantasia" da empresa. Os campos `cnpj` existentes na tabela `clients` permanecem por compatibilidade mas a UI passa a usar a nova tabela.

RLS em todas as novas tabelas seguindo o padrão existente (verificar `company_id` via join com `clients`).

### Mudanças na UI

**`CompanyInfoForm.tsx`** (admin) e **`NewClientDialog.tsx`** (commercial):
- Campo "Nome Fantasia" (clients.name) como campo principal
- Seção "Razões Sociais / CNPJs" com lista de cards e botão "+" para adicionar itens (legal_name + cnpj)
- Seção "Endereços" com lista e botão "+" para adicionar endereços (label, cep, logradouro, nº, cidade, UF)
- Cada item pode ser marcado como principal, editado ou removido

**`ContactsForm.tsx`**:
- No dialog de adicionar/editar contato, adicionar campo multi-select de embarcações do cliente (via vessels do client)
- Checkbox "Contato geral" (sem vínculo específico) — quando desmarcado, mostra selector de embarcações
- Exibir badges das embarcações vinculadas no card do contato

**`src/pages/admin/Clients.tsx`**:
- Adicionar botão "Visualizar" (ícone Eye) na lista de clientes, que abre um Sheet/Dialog de detalhes somente leitura (similar ao `ClientDetailSheet` do módulo comercial, mas adaptado para o admin)

### Hooks novos
- `useClientLegalEntities(clientId)` — CRUD para razões sociais
- `useClientAddresses(clientId)` — CRUD para endereços
- Estender `useClientContacts` para incluir vessel links

### Componentes novos
- `LegalEntitiesSection` — lista + botão add + dialog inline para razão social/CNPJ
- `AddressesSection` — lista + botão add + dialog inline para endereços
- `ClientViewDialog` — visualização somente leitura dos dados do cliente (admin)

### Detalhes técnicos
- As novas tabelas seguem o padrão de RLS via `user_company_id(auth.uid())` com join em `clients`
- Triggers de `update_updated_at` nas novas tabelas
- O campo `clients.cnpj` existente permanece para não quebrar queries existentes; a UI prioriza `client_legal_entities`

