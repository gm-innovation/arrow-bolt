# Corrigir a busca de produtos EVA na oportunidade

## Problema

O seletor "Produto (estoque EVA)" abre a lista, mas o campo "Buscar no EVA..." não aceita digitação.

A aba de produtos é exibida dentro do painel lateral de edição da oportunidade (`EditOpportunitySheet`), que é um componente modal do Radix com trava de foco. O conteúdo do seletor é renderizado em um portal fora desse painel, então a trava de foco devolve o foco ao painel e as teclas nunca chegam ao campo de busca.

## Solução

1. Marcar o popover do seletor de produtos como modal, para que ele assuma o controle do foco enquanto está aberto (`<Popover modal>` em `OpportunityProductsTab.tsx`).
2. Garantir o foco no campo de busca ao abrir (foco automático no `CommandInput`).
3. Manter a busca ao vivo no catálogo EVA já existente, sem mudança de comportamento de dados.

## Verificação

Abrir uma oportunidade, ir na aba Produtos, clicar em "Adicionar produto do estoque EVA", digitar parte de um nome/código e conferir que a lista filtra (validado no preview com navegador headless).

## Detalhes técnicos

- Arquivo: `src/components/commercial/opportunities/OpportunityProductsTab.tsx`
- `Popover open={pickerOpen} onOpenChange={setPickerOpen} modal`
- `CommandInput` com `autoFocus` (e, se necessário, `onOpenAutoFocus` no `PopoverContent` focando o input).
- Nenhuma alteração de hooks, banco ou Edge Functions.
