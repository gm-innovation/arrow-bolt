

## Problema

A query em `Employees.tsx` seleciona `department_id` e faz join com `departments(name)`, mas a coluna `department_id` não existe na tabela `profiles`. Isso causa erro 400 e retorna 0 resultados.

## Correção

**Arquivo: `src/pages/hr/Employees.tsx`**

1. Remover `department_id` do select da query
2. Remover o join `department:departments(name)` 
3. Remover referências a `department` no mapeamento e na interface `EmployeeRow`
4. Remover a coluna "Departamento" da tabela (ou mantê-la vazia por ora)

A query corrigida ficará:
```typescript
.select("id, full_name, email, avatar_url, phone, company_id, created_at")
```

Isso vai restaurar a listagem de todos os colaboradores e técnicos.

