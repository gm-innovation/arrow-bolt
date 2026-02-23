import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SuppliesSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações de Suprimentos</h2>
        <p className="text-muted-foreground">Categorias, limites de alçada e preferências</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Módulo em construção.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuppliesSettings;
