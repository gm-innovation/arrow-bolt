## Problema

Na listagem de colaboradores (`/hr/employees`), a coluna de data ainda mostra `created_at` (data de cadastro no sistema — 17/04/2026), enquanto a ficha do colaborador já exibe corretamente `hire_date` (01/01/2024, "Na empresa desde").

Isso gera inconsistência entre a lista e o detalhe.

## Correção

**`src/pages/hr/Employees.tsx`** (linha ~406):
- Trocar `new Date(emp.created_at).toLocaleDateString("pt-BR")` por `formatLocalDate(emp.hire_date)` com fallback para `created_at` quando `hire_date` for nulo.
- Usar o helper `formatLocalDate` já existente em `@/lib/utils` para evitar o shift de fuso horário.
- Renomear o header da coluna (se estiver como "Cadastrado em") para "Admissão", refletindo o dado correto.

Nenhuma alteração de banco ou lógica de negócio — apenas apresentação.