import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FinanceReports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Relatórios Financeiros</h2>
        <p className="text-muted-foreground">DRE simplificado e fluxo de caixa</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Relatórios</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Módulo em construção.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceReports;
