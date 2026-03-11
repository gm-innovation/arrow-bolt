

## Problema

O `supervisorId` é definido no Step 1 (useEffect linha 163-165) **antes** de `fetchInitialData` terminar de popular a lista `supervisors`. O Select component descarta valores que não existem nas suas opções. Já vessel, requester e taskTypes são tratados no Step 2, que espera as listas carregarem — mas supervisor e coordinator ficaram de fora desse mecanismo reativo.

## Correção

**Arquivo: `src/components/admin/orders/NewOrderForm.tsx`**

1. Remover `supervisorId` e `coordinatorId` do Step 1 (linhas 163-169)
2. Adicionar `supervisors` como dependência do Step 2 e aplicar supervisor/coordinator quando a lista estiver carregada:

```typescript
// Step 2: add supervisors to dependencies
useEffect(() => {
  const pending = pendingOmieData.current;
  if (!pending) return;

  // existing vessel/requester/taskType logic...

  // Apply supervisor when supervisors list is loaded
  if (pending.matchedSupervisorId && supervisors.length > 0) {
    if (supervisors.some(s => s.id === pending.matchedSupervisorId)) {
      form.setValue("supervisorId", pending.matchedSupervisorId);
    }
  }
  if (pending.matchedCoordinatorId && supervisors.length > 0) {
    if (supervisors.some(s => s.id === pending.matchedCoordinatorId)) {
      form.setValue("coordinatorId", pending.matchedCoordinatorId);
    }
  }

  // Clear pending when all lists loaded
  if (vessels.length > 0 && clientContacts.length > 0 && taskTypes.length > 0 && supervisors.length > 0) {
    pendingOmieData.current = null;
  }
}, [vessels, clientContacts, taskTypes, supervisors, form]);
```

Isso garante que o supervisor só é definido no formulário quando a lista já está disponível no Select.

