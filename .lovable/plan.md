

## Substituir Relatórios Corp por métricas relevantes ao RH

O "Resumo Financeiro" será removido e os relatórios serão reestruturados com dados operacionais que fazem sentido para o RH.

### Novo layout da página `src/pages/corp/Reports.tsx`

**Linha 1 — Cards de resumo (grid 4 colunas)**:
- Total de Solicitações
- Pendentes (gerente + diretoria)
- Aprovadas
- Rejeitadas

**Linha 2 — Gráficos (grid 2 colunas)**:
- **Distribuição por Status** (PieChart) — manter, já existe
- **Requisições por Departamento** (BarChart) — manter, já existe

**Linha 3 — Gráficos adicionais (grid 2 colunas)**:
- **Solicitações por Categoria** (PieChart) — agrupar por `request_type.category` (produto, documento, reembolso, folga, etc.)
- **Taxa de Aprovação por Departamento** (BarChart horizontal) — aprovadas vs total por departamento

### Dados necessários
- Ajustar `useCorpDashboard` para incluir `request_type_id` no select e fazer join com `corp_request_types` para obter `category`
- Ou criar os cálculos diretamente no componente de Reports com uma query dedicada

### Resumo das mudanças
- Remover card "Resumo Financeiro" (volume aprovado em R$, taxa de aprovação financeira)
- Adicionar cards de resumo operacional no topo
- Adicionar gráfico de solicitações por categoria
- Adicionar gráfico de taxa de aprovação por departamento

