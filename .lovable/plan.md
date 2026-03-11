

## Plano: Adicionar checkboxes de seleção na página admin de Clientes

### Contexto
As checkboxes e funcionalidade de agrupamento foram implementadas apenas em `src/components/commercial/clients/ClientsTable.tsx`. A página admin (`src/pages/admin/Clients.tsx`) usa um layout de cards sem checkboxes.

### Alterações em `src/pages/admin/Clients.tsx`

1. **Adicionar estado de seleção** — `selectedIds: Set<string>` e funções `toggleSelect`/`toggleAll`
2. **Checkbox em cada card** — inserir um `<Checkbox>` à esquerda do ícone de cada cliente
3. **Checkbox "selecionar todos"** — no header do card, ao lado da busca
4. **Botões de ação em grupo** — "Agrupar" e "Desagrupar" no header, visíveis quando há seleção
5. **Reutilizar `ClientGroupDialog`** — mesmo componente já criado para a página comercial
6. **Mutations de agrupamento** — lógica de `parent_client_id` igual à página comercial
7. **Indicação visual** — badge nos clientes que são "pai" mostrando quantidade de filhos, e indentação/badge nos filhos

