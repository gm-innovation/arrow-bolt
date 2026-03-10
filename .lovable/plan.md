

## Plano: OS individual por atividade de docagem + Relatórios individuais e consolidado

### Contexto
Atualmente, no modo docagem, todas as atividades ficam dentro de uma única OS. O coordenador precisa de:
1. Poder associar **OS diferentes** a cada atividade (opcionalmente)
2. Cada atividade gerar um **relatório individual**
3. Poder gerar um **relatório consolidado** agrupando todas as atividades da docagem

### Alterações no banco de dados

**Migração SQL:**
```sql
-- Coluna para agrupar atividades de uma mesma docagem
ALTER TABLE tasks ADD COLUMN docking_activity_group uuid;
-- Referência de docagem mãe (para consolidação)
ALTER TABLE service_orders ADD COLUMN parent_docking_id uuid REFERENCES service_orders(id);
```

- `docking_activity_group`: UUID compartilhado por tasks da mesma atividade (mesmo grupo data+equipe)
- `parent_docking_id`: quando o coordenador cria OS separadas por atividade, todas apontam para a OS "mãe" da docagem, permitindo consolidação

### Alterações em `DockingTasksSection.tsx`

Adicionar campo opcional de **número de OS** por atividade:

```text
┌─────────────────────────────────────────────┐
│ Atividade #1                          [🗑️]  │
│                                             │
│ Nº OS (opcional): [____________]            │
│ Data/Hora: [datetime-local]                 │
│ Tarefas: [badges]                           │
│ Equipe: [técnicos]                          │
└─────────────────────────────────────────────┘
```

Nova propriedade na interface `DockingActivity`:
```typescript
interface DockingActivity {
  id: string;
  orderNumber?: string; // OS específica (opcional)
  taskTypeIds: string[];
  scheduledDateTime: string;
  technicians: string[];
  leadTechId: string;
}
```

Se o coordenador **não preencher** o nº de OS, todas as atividades ficam na OS principal (comportamento atual). Se **preencher**, o sistema cria uma OS filha separada para aquela atividade.

### Alterações em `NewOrderForm.tsx` (submit)

No `onSubmit` com `isDocking = true`:
1. Criar a OS "mãe" normalmente (OS principal da docagem)
2. Para cada atividade:
   - Se tem `orderNumber` próprio: criar uma nova OS filha com `parent_docking_id` apontando para a mãe, criar visita, visit_technicians e tasks nessa OS filha
   - Se não tem `orderNumber`: criar tasks na OS mãe (comportamento atual), com `docking_activity_group` preenchido
3. Sempre preencher `docking_activity_group` em todas as tasks

### Alterações no sistema de relatórios

**`ReportForm.tsx`:**
- Ao carregar tasks de uma OS de docagem (`is_docking = true`), agrupar por `docking_activity_group`
- Cada grupo = uma "aba" de relatório individual (em vez de agrupar por task_type)
- Cada grupo gera seu próprio relatório com suas próprias fotos, horários, etc.

**Novo: Botão "Relatório Consolidado" no admin/coordenador:**
- Na lista de relatórios (`Reports.tsx` / `ServiceOrderReports.tsx`), quando a OS é `is_docking = true` ou tem `parent_docking_id`:
  - Mostrar botão "Relatório Consolidado"
  - Buscar todas as OS filhas + OS mãe via `parent_docking_id`
  - Usar `generateMultiTaskReportPdfBlob` (já existente) para gerar PDF unificado com todas as atividades

### Fluxo do coordenador
1. Cria OS de docagem (OS mãe)
2. Adiciona atividades -- opcionalmente com nº de OS diferente para cada uma
3. Atividades com OS própria geram OS filhas automaticamente
4. Técnicos veem suas tasks normalmente e preenchem relatórios individuais por atividade
5. Coordenador pode baixar relatório individual de cada atividade OU o consolidado da docagem inteira

### Resumo de arquivos alterados
- **DB**: `tasks.docking_activity_group`, `service_orders.parent_docking_id`
- **`DockingTasksSection.tsx`**: campo opcional de nº OS por atividade
- **`NewOrderForm.tsx`**: lógica de criação de OS filhas + preenchimento de `docking_activity_group`
- **`ReportForm.tsx`**: agrupar tabs por `docking_activity_group` em OS de docagem
- **`Reports.tsx` / `ServiceOrderReports.tsx`**: botão de relatório consolidado para docagens

