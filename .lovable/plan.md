## Tornar "Na empresa desde" editável (hire_date)

Hoje o campo "Na empresa desde" em `PersonalTab` (`EmployeeDetailSheet.tsx`) é renderizado como texto somente-leitura a partir de `created_at`. A coluna `hire_date` já existe em `profiles`, mas não é editável na UI — por isso Hugo (e outros importados) ficam sem data de admissão, o que impede a geração automática de períodos aquisitivos de férias.

### Correção
1. Adicionar estado `hireDate` no `PersonalTab` inicializado com `employee.hire_date`.
2. Substituir o item read-only "Na empresa desde" por um campo editável: `type="date"` no modo edição, exibindo `dd/MM/yyyy` (com fallback `created_at`) no modo leitura.
3. Incluir `hire_date: hireDate || null` no `profileUpdate` do `handleSave`.
4. Reset em `handleCancel`.
5. Melhorar tratamento de erro: mostrar `error.message` no toast em vez de mensagem genérica, facilitando diagnóstico caso RLS/coluna falhem.
6. Garantir que `EmployeeRow` (em `pages/hr/Employees.tsx`) inclua `hire_date` no SELECT — verificar e adicionar se ausente.

Sem mudanças no banco.