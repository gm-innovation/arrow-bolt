import EvaStockPanel from "@/components/commercial/products/EvaStockPanel";

const Products = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-foreground">Catálogo de Estoque</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Os produtos são cadastrados por Suprimentos diretamente no EVA e consultados aqui pelo Comercial.
      </p>
    </div>

    <EvaStockPanel />
  </div>
);

export default Products;
