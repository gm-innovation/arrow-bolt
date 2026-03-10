

## Plano: Redesenhar interface de Transferência de Técnicos

### Problema atual
O dialog mostra uma lista plana de tarefas com checkboxes e um único seletor de "novo técnico". Não fica claro quem é o responsável (lead) vs auxiliar, e a experiência de "selecionar tarefas" é confusa para o usuário.

### Nova interface proposta

A ideia é reorganizar o dialog em duas seções claras:

**Seção 1 - Equipe Atual** (somente leitura, informativa)
- Exibir o **Técnico Responsável** (lead) com badge destacado
- Listar os **Auxiliares** com suas respectivas tarefas
- Buscar dados de `visit_technicians` (is_lead) para distinguir lead de auxiliares

**Seção 2 - Transferência**
- Dropdown "Técnico a substituir": lista os técnicos atualmente na OS (lead e auxiliares)
- Dropdown "Novo técnico": lista técnicos disponíveis (excluindo o selecionado acima)
- Ao selecionar o técnico a substituir, mostrar automaticamente as tarefas que serão transferidas (pré-selecionadas)
- Campo de motivo (opcional)

### Fluxo do usuário
1. Abre o dialog e vê a equipe completa da OS
2. Seleciona qual técnico quer substituir
3. Seleciona o novo técnico
4. Vê quais tarefas serão afetadas
5. Confirma

### Alterações técnicas

#### `src/components/admin/orders/TransferTechniciansDialog.tsx`
- No `fetchData`, buscar também `visit_technicians` com `is_lead` para identificar lead vs auxiliares
- Agrupar tarefas por técnico atribuído
- Substituir a UI:
  - Seção "Equipe Atual": cards mostrando lead (com badge "Responsável") e auxiliares (com badge "Auxiliar"), cada um com suas tarefas listadas abaixo
  - Select "Técnico a substituir": populado com técnicos da OS
  - Select "Substituir por": populado com técnicos disponíveis (excluindo o selecionado)
  - Preview das tarefas afetadas (automático, baseado no técnico selecionado)
  - Textarea de motivo
- Na lógica de submit, selecionar automaticamente todas as tarefas do técnico escolhido (sem checkboxes manuais)
- Se o técnico substituído for o lead, atualizar `visit_technicians.is_lead` também

