## Remover campo "Categoria" de Partes Interessadas

A solicitação era remover o campo **Categoria** do cadastro/edição de Partes Interessadas, pois não é uma regra obrigatória ter aquelas categorias fixas (Cliente, Fornecedor, Órgão Regulador etc.).

### Alterações

1. **Diálogo de criação/edição** (`src/components/quality/parties/PartyDialog.tsx` ou equivalente): remover o `<Select>` de Categoria e o estado relacionado. Ajustar o grid para que "Relevância" ocupe a linha sozinha ou ao lado de outro campo já existente.

2. **Hook `useQualityInterestedParties.ts`**: remover `category` do payload de `create` e tornar opcional na tipagem (`QIPCategory` vira opcional). Manter o campo no banco por compatibilidade retroativa (dados antigos continuam válidos), apenas parar de exigir/enviar.

3. **Listagem / tabela de Partes Interessadas** (`src/pages/quality/InterestedParties.tsx` e componentes de tabela/matriz): remover coluna e filtros por Categoria. Ajustar agrupamentos (ex.: matriz Poder×Interesse) para não depender mais de categoria.

4. **Migração leve (opcional)**: tornar `category` nullable em `quality_interested_parties` caso hoje seja `NOT NULL`, para permitir novos registros sem categoria. Confirmar antes de aplicar.

### Fora de escopo
- Não alterar SWOT, Processos ou outras áreas.
- Não remover dados existentes de categoria já cadastrados.
