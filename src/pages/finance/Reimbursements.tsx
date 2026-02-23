import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FinanceReimbursements = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Reembolsos</h2>
        <p className="text-muted-foreground">Solicitações de reembolso e comprovantes</p>
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

export default FinanceReimbursements;
