

## Plano: Diretores Pulam Aprovação

### Regra
Quando o criador da solicitação é um diretor (role = `director`, `admin` ou `super_admin`), tipos que normalmente exigem aprovação da diretoria (`pending_director`) devem ir direto para `pending_department`.

### Alteração única

**`src/components/corp/NewRequestDialog.tsx`** — função `determineStatus()`:

```typescript
const determineStatus = () => {
  if (!selectedType) return 'open';
  const isDirector = userRole === 'director' || userRole === 'admin' || userRole === 'super_admin';
  if (selectedType.requires_director_approval && !isDirector) return 'pending_director';
  if (selectedType.department_id) return 'pending_department';
  return 'open';
};
```

`userRole` já está disponível via `useAuth()` que já é importado no componente. Nenhuma outra alteração necessária — o resto do fluxo (departamento, ApprovalActions) já trata `pending_department` corretamente.

