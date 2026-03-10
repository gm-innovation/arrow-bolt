

## Plano: Catálogo de Estoque Eva + Vendas Comerciais

### Limitação atual
A API do Eva só possui o endpoint `get-os-data` que retorna materiais vinculados a uma OS específica. Não existe endpoint para listar o catálogo completo de produtos ou consultar saldo em estoque, nem para registrar saídas/retiradas.

Para viabilizar o fluxo desejado (ver estoque → vender → dar baixa), precisamos de uma abordagem híbrida.

### Abordagem proposta

**1. Catálogo local alimentado pelo Eva**
- Criar tabela `stock_products` que acumula produtos únicos a partir dos materiais importados do Eva (por `external_product_id`)
- Cada vez que uma OS sincroniza materiais do Eva, os produtos novos são inseridos/atualizados no catálogo local
- Campos: código Eva, nome, custo unitário (último valor), categoria, quantidade em estoque (manual até Eva fornecer endpoint)
- A página de Produtos do comercial passa a mostrar este catálogo com filtros e busca

**2. Vendas vinculadas a oportunidades**
- Criar tabela `crm_sales` (oportunidade, cliente, data, status: rascunho/confirmada/entregue/cancelada)
- Criar tabela `crm_sale_items` (produto do catálogo, quantidade, valor unitário, markup, valor total)
- Na oportunidade, botão "Gerar Venda" que abre formulário para selecionar produtos do catálogo, definir quantidades e preços
- Ao confirmar venda, decrementar `current_quantity` no catálogo local

**3. Preparação para integração de baixa no Eva**
- Edge function `stock-withdrawal` preparada como placeholder
- Quando Eva disponibilizar endpoint de retirada, basta preencher a chamada

### Alterações no banco de dados

```sql
-- Catálogo local de produtos do estoque
CREATE TABLE stock_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  external_product_id integer,
  external_product_code text,
  name text NOT NULL,
  category text,
  unit text DEFAULT 'un',
  current_quantity numeric DEFAULT 0,
  min_quantity numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, external_product_id)
);

-- Vendas comerciais
CREATE TABLE crm_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  opportunity_id uuid REFERENCES crm_opportunities(id),
  client_id uuid REFERENCES clients(id),
  sale_number text,
  status text DEFAULT 'draft', -- draft, confirmed, delivered, cancelled
  total_amount numeric DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Itens da venda
CREATE TABLE crm_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES crm_sales(id) ON DELETE CASCADE,
  stock_product_id uuid REFERENCES stock_products(id),
  name text NOT NULL,
  quantity numeric NOT NULL,
  unit_value numeric DEFAULT 0,
  markup_percentage numeric DEFAULT 0,
  total_value numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

### Arquivos criados/alterados

- **DB Migration**: tabelas `stock_products`, `crm_sales`, `crm_sale_items` com RLS por company_id
- **`src/hooks/useStockProducts.ts`**: CRUD + auto-upsert a partir de dados Eva
- **`src/hooks/useCrmSales.ts`**: criar/listar vendas e itens
- **`src/pages/commercial/Products.tsx`**: reformular para mostrar catálogo de estoque (quantidade, custo, status) em vez do `crm_products`
- **`src/components/commercial/sales/CreateSaleDialog.tsx`**: formulário de venda com seleção de produtos do catálogo
- **`src/hooks/useOsMaterials.ts`**: ao sincronizar do Eva, fazer upsert no `stock_products`
- **Rota de Vendas**: nova página ou aba para listar vendas geradas

### Fluxo do usuário
1. Materiais chegam do Eva via sincronização de OS → catálogo local é populado
2. Comercial acessa Produtos → vê catálogo com preço e quantidade disponível
3. Na oportunidade, clica "Gerar Venda" → seleciona produtos, quantidades → confirma
4. Sistema registra venda e dá baixa na quantidade local
5. (Futuro) Quando Eva fornecer endpoint, a baixa é replicada automaticamente

