

## Adicionar roles Suprimentos, Qualidade e Financeiro nos dropdowns de usuários

As novas roles (`compras`, `qualidade`, `financeiro`) foram adicionadas ao banco de dados e ao sistema de navegação, mas os dropdowns de seleção de função nas telas de gerenciamento de usuários não foram atualizados. Faltam as opções nos seguintes locais:

### Arquivos a alterar

**1. `src/pages/super-admin/Users.tsx`**
- Linha 92-106: Adicionar cases no `getRoleLabel` para `commercial`, `director`, `compras`, `qualidade`, `financeiro`
- Linhas 141-145: Adicionar SelectItems no filtro de roles para as novas funções

**2. `src/components/super-admin/users/NewUserDialog.tsx`**
- Linhas 182-188: Adicionar SelectItems `director`, `compras`, `qualidade`, `financeiro` no dropdown de função

**3. `src/components/super-admin/users/EditUserDialog.tsx`**
- Linhas 158-163: Adicionar SelectItems `director`, `compras`, `qualidade`, `financeiro` no dropdown de função

**4. `src/pages/admin/Users.tsx`**
- Linhas 178-182: Adicionar as novas roles no filtro de funções

### Valores a adicionar em todos os dropdowns

| Valor | Label |
|-------|-------|
| `commercial` | Comercial |
| `director` | Diretor |
| `compras` | Suprimentos |
| `qualidade` | Qualidade |
| `financeiro` | Financeiro |

Alteração simples e localizada, sem impacto em banco de dados ou lógica de negócio.

