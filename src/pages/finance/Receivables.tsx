import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FinanceReceivables = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Contas a Receber</h2>
        <p className="text-muted-foreground">Faturamento e acompanhamento de recebimentos</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Listagem</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Módulo em construção.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceReceivables;
