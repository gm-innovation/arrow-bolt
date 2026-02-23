import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FinanceSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações Financeiras</h2>
        <p className="text-muted-foreground">Categorias, alertas de vencimento e preferências</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Configurações</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Módulo em construção.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceSettings;
