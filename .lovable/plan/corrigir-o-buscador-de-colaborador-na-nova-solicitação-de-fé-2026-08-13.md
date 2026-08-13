# Corrigir o buscador de colaborador na Nova Solicitação de Férias

O campo de colaborador hoje usa um popover com componente de comando (cmdk) dentro do diálogo. Dentro do diálogo o foco fica preso no conteúdo do diálogo e o campo de busca não recebe digitação; a lista também não rola com a roda do mouse porque o popover intercepta os eventos.

## O que muda

- Sai o popover: a busca passa a ser um campo de texto comum, sempre visível dentro do diálogo, com a lista de colaboradores logo abaixo.
- A lista tem altura fixa (~15rem) com barra de rolagem real, rolável por roda do mouse e teclado.
- Digitar filtra por nome e cargo, sem acento e sem diferenciar maiúsculas.
- Clicar em um nome seleciona o colaborador, destaca a linha escolhida e mostra o nome selecionado acima da busca; a lista continua aberta para troca rápida.
- Mensagem "Nenhum colaborador encontrado" quando o filtro não retorna nada.
- Restante do formulário (tipo, abono, datas, divisão de férias, validações de 14/5 dias e ordem das datas) permanece igual.

## Detalhes técnicos

- `src/pages/hr/Vacations.tsx`: substituir `Popover` + `Command*` no campo Colaborador por `Input` de busca + `div` com `max-h-60 overflow-y-auto` e botões por item; filtro via `useMemo` com normalização de acentos (`normalize("NFD")`).
- Remover imports não usados (`Popover*`, `Command*`, `ChevronsUpDown`) e o estado `employeeOpen`.
- Adicionar `DialogDescription` no `DialogContent` para eliminar o aviso de acessibilidade `aria-describedby` que aparece no console.
- Sem mudanças de hooks, dados ou banco.
