

## Problema: Limite de 1000 registros do banco de dados

A empresa tem **2.562 clientes** cadastrados. O banco de dados retorna no máximo **1.000 registros** por consulta por padrão. Ordenando por nome, o corte acontece na letra "G" --- tudo de "H" em diante (incluindo "Oceanpact") simplesmente não é retornado.

Isso afeta **duas telas**:
1. **Listagem de Clientes** (`src/pages/admin/Clients.tsx`) --- busca mostra "nenhum cliente encontrado"
2. **Formulário de OS** (`src/components/admin/orders/NewOrderForm.tsx`) --- dropdown de cliente não mostra Oceanpact, logo embarcação e solicitante também ficam vazios

O problema é puramente de limite de dados, não de permissão (RLS).

---

## Correção

### 1. Listagem de Clientes --- paginação com busca server-side

Com 2500+ clientes, carregar todos no frontend não é viável. Implementar:

- Busca server-side: ao digitar no campo de busca, consultar o banco com filtro `ilike`
- Paginação: carregar 50 clientes por página com botões "anterior/próximo"
- Remover o filtro client-side (atualmente `filteredTopLevel` filtra em memória sobre dados incompletos)

### 2. Formulário de OS --- Combobox com busca server-side

Substituir o `Select` de cliente por um `Combobox` com busca:

- Ao digitar 2+ caracteres, buscar clientes no banco com `ilike`
- Mostrar resultados com identificação de grupo (se `parent_client_id` existe, mostrar o pai; se tem filhos, mostrar badge de grupo)
- Manter comportamento atual de carregar embarcações e contatos ao selecionar

### 3. Identificação de grupos no dropdown (conforme solicitado)

Exibir clientes com indicação visual:
- Clientes que são "pai" de grupo: badge "Grupo" + quantidade de vinculados
- Clientes vinculados: indent + nome do pai entre parênteses
- Embarcações de todos: ao selecionar um pai, mostrar embarcações de todas as filhas também

### Arquivos a alterar

- `src/pages/admin/Clients.tsx` --- paginação + busca server-side
- `src/components/admin/orders/NewOrderForm.tsx` --- combobox com busca server-side para cliente
- Criar `src/components/admin/orders/ClientSearchCombobox.tsx` --- componente reutilizável de busca de cliente

### Resultado esperado
- Todos os 2.562 clientes acessíveis em ambas as telas
- Performance adequada (não carrega tudo de uma vez)
- Oceanpact aparece normalmente ao buscar

