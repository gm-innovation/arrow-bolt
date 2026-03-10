

## Plano: Impedir seleção duplicada de técnico substituto

### Problema
O dropdown "Substituir por" permite selecionar o mesmo técnico como substituto em múltiplas transferências pendentes.

### Alteração em `TransferTechniciansDialog.tsx`

Atualizar o `availableNewTechnicians` para também excluir técnicos já selecionados como destino em `pendingTransfers`:

```tsx
const availableNewTechnicians = useMemo(
  () => {
    const usedAsTarget = new Set(pendingTransfers.map(t => t.toTechId));
    return allTechnicians.filter(t => t.id !== techToReplace && !usedAsTarget.has(t.id));
  },
  [allTechnicians, techToReplace, pendingTransfers]
);
```

Adicionalmente, excluir técnicos que já fazem parte da equipe atual (exceto o que está sendo substituído), para evitar transferir para alguém que já está na OS.

