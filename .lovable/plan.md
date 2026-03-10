

## Plano: Adicionar campos de recorrência ao cadastro de Tipos de Tarefa

### Objetivo
Adicionar ao cadastro de tipos de tarefa os campos: **Recorrente** (switch), **Tipo de Recorrência** (Manutenção/Renovação/Serviço Recorrente), **Tipo de Valor** (Fechado ou HH - Homem/Hora), **Periodicidade padrão** (meses) e **Valor estimado padrão**.

### 1. Migração de banco de dados
Adicionar 4 colunas na tabela `task_types`:
```sql
ALTER TABLE task_types
  ADD COLUMN is_recurrent boolean NOT NULL DEFAULT false,
  ADD COLUMN recurrence_type text,        -- maintenance, renewal, recurring_service
  ADD COLUMN pricing_type text,           -- fixed, hourly
  ADD COLUMN default_periodicity integer, -- meses
  ADD COLUMN default_estimated_value numeric;
```

### 2. Formulários (NewTaskTypeDialog + EditTaskTypeDialog)
Adicionar seção "Recorrência" após a descrição, com:
- **Switch** "Tarefa Recorrente" com texto explicativo
- Quando ativo, exibir:
  - **Select** "Tipo de Recorrência": Manutenção / Renovação / Serviço Recorrente
  - **Select** "Tipo de Valor": Valor Fechado / Homem-Hora (HH)
  - **Input** "Periodicidade padrão (meses)"
  - **Input** "Valor estimado padrão (R$)"

### 3. Interface TaskType
Atualizar a interface `TaskType` nos 3 arquivos (TaskTypes.tsx, EditTaskTypeDialog.tsx, ViewTaskTypeDialog.tsx) para incluir os novos campos.

### 4. Tabela de listagem (TaskTypes.tsx)
Adicionar coluna "Recorrente" com ícone RefreshCw quando `is_recurrent = true`, mostrando tipo e periodicidade.

### 5. Persistência
- No `handleCreateTaskType` (TaskTypes.tsx), salvar os novos campos no insert
- No `handleSubmit` do EditTaskTypeDialog, salvar no update
- No ViewTaskTypeDialog, exibir os campos de recorrência quando presentes

