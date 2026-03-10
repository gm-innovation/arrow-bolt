

## Plano: Adicionar "Referência do Cliente" na OS + Permitir edição do número da OS após finalização

### Duas funcionalidades

**1. Campo `client_reference` na OS** — código de pedido do cliente (PC, PO, RFQ, etc.)
**2. Edição do `order_number` mesmo após a OS ser finalizada**

---

### Alterações

#### 1. Migração SQL
```sql
ALTER TABLE service_orders ADD COLUMN client_reference text;
```

#### 2. Formulário de criação — `NewOrderDialog.tsx`
- Adicionar campo "Ref. Cliente (PC/PO/RFQ)" ao lado do campo "Nº da OS" no header
- Passar `clientReference` como prop para `NewOrderForm`

#### 3. Formulário de criação/edição — `NewOrderForm.tsx`
- Receber prop `clientReference` (opcional)
- Incluir `client_reference` no INSERT (criação) e UPDATE (edição)
- Carregar `client_reference` existente em `loadOrderData`
- **Permitir edição do `order_number` no modo edição**: adicionar campo editável de número da OS no formulário de edição, sem restrição por status (mesmo OS `completed` pode ter o número alterado)

#### 4. Dialog de edição — `EditOrderDialog.tsx`
- Adicionar campo editável para `order_number` e `client_reference` no header do dialog
- Passar ambos como props para `NewOrderForm`

#### 5. Listagem — `useServiceOrders.ts`
- Incluir `client_reference` no select

#### 6. Listagem — `ServiceOrders.tsx`
- Exibir `client_reference` na tabela (coluna "Ref. Cliente") quando preenchido

#### 7. Visualização — `ViewOrderDetailsDialog.tsx`
- Exibir "Ref. Cliente" na seção de informações básicas
- Incluir `client_reference` na query

#### 8. Relatório PDF — `ServiceOrderInfo.tsx`
- Adicionar prop `clientReference` (opcional)
- Exibir linha "Ref. Cliente: XXXX" abaixo do número da OS

#### 9. Relatório PDF — `ReportPDF.tsx`
- Passar `clientReference` do `serviceOrder` para `ServiceOrderInfo`
- Incluir `client_reference` nas queries que montam o objeto `serviceOrder`

#### 10. Medição — `BasicInfoTab.tsx`
- Incluir `client_reference` na query
- Exibir campo "Ref. Cliente" ao lado do número da OS

