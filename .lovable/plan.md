

## Plano: Modo Docagem com múltiplas tarefas por atividade

### Conceito
Cada "atividade de docagem" é um grupo com **data/hora + equipe + múltiplas tarefas**. O coordenador monta atividades onde cada uma pode ter N tipos de tarefa, sua própria data e sua própria equipe.

### Alterações no banco de dados

**Migração SQL:**
- Adicionar `is_docking` (boolean, default false) na tabela `service_orders`
- Adicionar `scheduled_date` (date, nullable) e `scheduled_time` (time, nullable) na tabela `tasks` para data individual por tarefa

### Novo componente: `DockingTasksSection.tsx`

Estrutura de cada atividade:
```text
┌─────────────────────────────────────────────┐
│ Atividade #1                          [🗑️]  │
│                                             │
│ Data/Hora: [datetime-local input]           │
│                                             │
│ Tarefas: [Select múltiplo - badges]         │
│   ┌──────────┐ ┌──────────┐                │
│   │ Tarefa A × │ Tarefa B × │              │
│   └──────────┘ └──────────┘                │
│                                             │
│ Equipe: [Select técnico]                    │
│   ○ Técnico 1 (Responsável)          [×]   │
│   ○ Técnico 2 (Auxiliar)             [×]   │
└─────────────────────────────────────────────┘

         [+ Adicionar Atividade]
```

**Interface do state:**
```typescript
interface DockingActivity {
  id: string; // uuid local
  taskTypeIds: string[]; // múltiplas tarefas
  scheduledDateTime: string;
  technicians: string[];
  leadTechId: string;
}
```

### Alterações em `NewOrderForm.tsx`

- Adicionar state `isDocking` (boolean) e `dockingActivities` (array)
- Toggle "Modo Docagem" abaixo da descrição
- Quando `isDocking = true`:
  - Esconder `ServiceDetails` e `TechniciansSelection` globais
  - Mostrar `DockingTasksSection`
  - A validação do zod para `taskTypes` fica condicional (não obrigatório em modo docagem)
- No `onSubmit` com `isDocking = true`:
  - Salvar `is_docking = true` na OS
  - Para cada atividade, criar 1 task por tipo de tarefa, com `scheduled_date` individual e `assigned_to` do lead
  - Se `singleReport = false`, criar 1 task por técnico por tipo
  - Consolidar todos os técnicos de todas as atividades em `visit_technicians`
  - Notificações individuais por atividade (cada técnico recebe a data da sua atividade)

### Alterações em `ServiceDetails.tsx`
- Receber prop `isDocking` para esconder o seletor de tarefas quando em modo docagem (as tarefas ficam dentro de cada atividade)

### Fluxo do usuário
1. Preenche dados básicos (cliente, embarcação, data geral de início)
2. Ativa toggle "Docagem"
3. Adiciona atividades, cada uma com data, múltiplas tarefas e equipe própria
4. Salva -- todas as atividades viram tasks independentes com datas e técnicos específicos

