

## Unificar Técnicos e Colaboradores em uma única página

### Situação atual
- **`/hr/employees`** (Colaboradores): Lista todos os perfis da empresa com ficha (dados, docs, histórico, anotações). Sem CRUD.
- **`/hr/technicians`** (Técnicos): Lista apenas técnicos com CRUD completo (criar, editar, excluir), gestão de ASO, certificações, dados médicos. ~1100 linhas.

### Plano

#### 1. Expandir a página Colaboradores (`/hr/employees`)
- Adicionar coluna "ASO" na tabela para colaboradores que são técnicos (com badge de status: válido/vencendo/vencido)
- Adicionar coluna "Especialidade" para técnicos
- Fetch cruzado: buscar dados de `technicians` para enriquecer a listagem
- Manter botão "Novo Técnico" (reutilizar `NewTechnicianForm`)
- Adicionar filtro por departamento além do filtro por cargo

#### 2. Expandir o EmployeeDetailSheet
- Adicionar aba "Técnico" (visível apenas se o colaborador for técnico) com:
  - Dados médicos (ASO, tipo sanguíneo, altura, etc.)
  - Especialidade
  - Documentos técnicos (ASO, certificações) com upload/download/delete
  - Botão editar dados técnicos (reutilizar `NewTechnicianForm` em modo edição)
- Adicionar botões de ação no header: Editar, Excluir (para técnicos)

#### 3. Remover página Técnicos separada
- Remover `/hr/technicians` do `App.tsx`
- Remover item "Técnicos" do menu lateral em `DashboardLayout.tsx`
- Manter o arquivo `Technicians.tsx` por ora (pode ser removido depois), mas a rota não existirá mais

#### 4. Arquivos alterados
- **`src/pages/hr/Employees.tsx`**: Adicionar fetch de `technicians`, colunas ASO/especialidade, botão "Novo Técnico", lógica de criação
- **`src/components/hr/EmployeeDetailSheet.tsx`**: Adicionar aba "Técnico" com dados médicos, documentos técnicos, edição e exclusão
- **`src/components/DashboardLayout.tsx`**: Remover item "Técnicos" do menu
- **`src/App.tsx`**: Remover rota `/hr/technicians`

