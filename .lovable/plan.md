# Correção do Walkthrough — ordem e âncoras

## Problemas confirmados

1. **"Exportar Lista" parece pulado** em Empresas e Usuários. Está semeado como sub-passo de índice 4 (último), então aparece só no fim do bloco da página. Como visualmente ele fica ao lado do "Nova Empresa", o usuário percebe como salto de "Nova Empresa" → "Filtros".
2. **`data-tour="users-row-actions"` na célula errada** em `src/pages/super-admin/Users.tsx:271` — está na `TableCell` de "Data de Criação"; o menu de ações fica em outra `TableCell` (linha 275) sem `data-tour`. O spotlight de "Ações da linha" ilumina a coluna de data.
3. **Cobertura**: revisando `Companies.tsx` e `Users.tsx`, os sub-passos atuais cobrem `new`, `export`, `filters`, `table`, `row-actions`. O botão "Limpar Filtros" só aparece quando há filtro ativo (não é elemento fixo, ok deixar fora). Nenhum outro elemento fixo está descoberto nessas duas telas.

## Correções

### 1. Reordenar sub-passos (Empresas + Usuários)
Nova ordem em `walkthrough_steps` (UPDATE dos `order_index` dos sub-passos já existentes):

| order_index | selector |
|---|---|
| 0 | `[data-tour=".*-new"]` |
| 1 | `[data-tour=".*-export"]` |
| 2 | `[data-tour=".*-filters"]` |
| 3 | `[data-tour=".*-table"]` |
| 4 | `[data-tour=".*-row-actions"]` |

Assim o balão passa Nova Empresa → Exportar Lista → Filtros → Tabela → Ações da linha, respeitando a leitura visual da tela.

### 2. Corrigir âncora de "Ações da linha" em Usuários
Em `src/pages/super-admin/Users.tsx`:
- Remover `data-tour="users-row-actions"` da `TableCell` de data (linha 271).
- Adicionar `data-tour="users-row-actions"` na `TableCell` que contém o `DropdownMenu` (linha 275).

Em `Companies.tsx` a âncora já está na célula correta (linha 259 envolve o `DropdownMenu`), não precisa mexer.

### 3. Auditoria dos elementos das duas telas
Após o fix, cada sub-passo aponta para um elemento real e único:

- Users: `users-new` (NewUserDialog trigger), `users-export` (botão Exportar), `users-filters` (linha de filtros), `users-table` (tabela), `users-row-actions` (célula do menu ⋯).
- Companies: `companies-new`, `companies-export`, `companies-filters`, `companies-table`, `companies-row-actions`.

Nada mais na tela precisa de sub-passo dedicado (o botão "Limpar Filtros" é contextual e o cabeçalho da tabela é descritivo).

## Fora de escopo desta entrega

Desdobrar em sub-passos as outras páginas do tour do Super Admin (Dashboard, Inbox, PM, Roadmap, Walkthroughs, Feed, Solicitações, Configurações). Elas continuam como passo-pai único apontando para a sidebar até você pedir.

## Detalhes técnicos

- Duas ações: um `UPDATE` em `public.walkthrough_steps` (só re-mapeia `order_index` dos 10 sub-passos existentes por `selector`) e uma edição no JSX de `Users.tsx` movendo o atributo `data-tour`.
- Sem migration de schema. Sem RLS. Sem mudanças no overlay ou no contexto.
