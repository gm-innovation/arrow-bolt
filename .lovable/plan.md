## Problema

No diálogo "Registrar Evento de Conscientização" (`/quality/competencies/awareness`), a lista de colaboradores abre mas clicar em um nome não o adiciona à seleção. Nenhum badge aparece e o contador continua em 0.

## Causa

Em `src/components/quality/awareness/AwarenessFormDialog.tsx`:

1. `CommandItem` está sem a prop `value` explícita — o cmdk usa o texto como value, e o filtro/seleção pode não disparar `onSelect` corretamente quando o Popover está dentro de um Dialog do Radix (conflito de foco/pointer-events já conhecido).
2. Falta `onMouseDown` para evitar que o Popover feche por perda de foco antes do clique registrar.
3. O `CommandInput` não tem estado controlado, então a busca também não filtra.

## Correção (somente UI, arquivo único)

Editar `src/components/quality/awareness/AwarenessFormDialog.tsx`:

- Substituir o bloco Popover+Command por um seletor que funcione dentro do Dialog:
  - Opção escolhida: manter Popover, mas em cada `CommandItem` adicionar `value={u.full_name}` e usar `onSelect` com id capturado no closure, além de `onMouseDown={(e) => e.preventDefault()}` para não perder foco.
  - Adicionar estado `search` controlando `CommandInput` e filtrar `users` manualmente (case-insensitive) antes de mapear.
  - Manter checkmark e badges já existentes.

Nada mais será alterado (nenhuma migração, hook, ou outra tela).

## Verificação

Após a mudança:
- Abrir o diálogo, clicar em um nome → badge aparece e contador incrementa.
- Buscar por texto filtra a lista.
- Clicar de novo remove a seleção.
