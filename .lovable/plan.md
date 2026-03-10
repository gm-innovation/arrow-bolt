

## Plano: Mover "Ver Medição" / "Criar Medição" do modal de detalhes para o dropdown de ações

### Alterações

#### 1. `src/components/admin/orders/ViewOrderDetailsDialog.tsx`
- Remover os botões "Criar Medição Final" e "Ver Medição" do header do dialog (linhas 199-220)
- Remover states e hooks relacionados ao `MeasurementDialog` (`showMeasurementDialog`, `useMeasurements`, `handleCreateMeasurement`)
- Remover o `<Dialog>` do `MeasurementDialog` no final do componente
- Remover imports não utilizados (`Plus`, `FileText`, `MeasurementDialog`, `useMeasurements`, `Dialog`)

#### 2. `src/pages/admin/ServiceOrders.tsx`
- Importar `useMeasurements` e `MeasurementDialog`
- Adicionar novo dialog type `"measurement"` ao `activeDialog`
- No `DropdownMenuContent`, adicionar item "Ver Medição" (quando já existe medição) ou "Criar Medição Final" (quando OS concluída e sem medição) — isso requer buscar o estado de medição por ordem. Como isso pode ser custoso para cada linha, a abordagem mais simples: adicionar o item "Medição" que abre o dialog, e dentro dele o `MeasurementDialog` verifica/cria
- Adicionar item condicional no dropdown:
  - Para OS com status `completed`: mostrar item "Medição Final" com ícone `FileText`
- Adicionar dialog `MeasurementDialog` controlado por `activeDialog === "measurement"`

#### Abordagem simplificada
Como verificar se cada OS tem medição na listagem seria custoso, vou adicionar um item "Medição Final" no dropdown para todas as OS com status `completed`. O `MeasurementDialog` + `MeasurementForm` já lidam internamente com criar ou exibir a medição existente.

