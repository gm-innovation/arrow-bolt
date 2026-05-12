## Problema

No diálogo "Converter em oportunidade", o seletor de cliente:
1. Não rola (lista travada nos primeiros itens visíveis)
2. Clicar em uma empresa não a seleciona

Causa: o `cmdk` (Command/CommandItem) dentro de um `Dialog` Radix tem problemas conhecidos — o `onSelect` não dispara ao clicar com o mouse (o Dialog intercepta foco/pointer), e a rolagem do `CommandList` também é prejudicada nesse contexto.

## Solução

Substituir o `Command` + `CommandItem` dentro do `Popover` por uma lista simples controlada manualmente, mantendo o mesmo visual e comportamento já desenhado:

- Manter o `Popover` aberto pelo mesmo botão "Selecionar cliente...".
- Dentro do `PopoverContent`:
  - `Input` próprio para "Buscar por nome ou CNPJ..." (controlado por `clientSearch`).
  - Bloco "Sugestão do lead" inalterado.
  - Lista rolável: `<div className="max-h-72 overflow-y-auto">` com cada item como `<button type="button" onClick={...}>` que chama `setClientId(c.id)` e fecha o popover.
  - Estado vazio quando `filteredClients.length === 0` (mesma mensagem + "Limpar busca" + link "Cadastrar novo cliente").
  - Rodapé "Mostrando 100 de N" quando aplicável.
- Manter `filteredClients` e `totalMatches` como estão.
- Remover imports não utilizados (`Command`, `CommandItem`, etc.) caso fiquem órfãos.

Arquivo afetado: `src/pages/commercial/SiteLeads.tsx` (apenas o trecho do seletor de cliente, linhas ~438-499). Sem mudanças em backend, schema ou outras telas.
