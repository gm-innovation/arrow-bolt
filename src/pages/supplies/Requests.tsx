import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SuppliesRequests = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Solicitações de Compra</h2>
          <p className="text-muted-foreground">Gerencie suas solicitações de materiais e serviços</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Módulo em construção. As tabelas serão criadas na próxima etapa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuppliesRequests;
