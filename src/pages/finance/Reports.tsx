import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinancePayables, useFinanceReceivables, useFinanceReimbursements } from "@/hooks/useFinance";

const FinanceReports = () => {
  const { payables } = useFinancePayables();
  const { receivables } = useFinanceReceivables();
  const { reimbursements } = useFinanceReimbursements();

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalPaid = payables.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalReceived = receivables.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const totalReimbursed = reimbursements.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const netResult = totalReceived - totalPaid - totalReimbursed;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Relatórios Financeiros</h2>
        <p className="text-muted-foreground">DRE simplificado e indicadores</p>
      </div>

      <Card>
        <CardHeader><CardTitle>DRE Simplificado (Período Atual)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Receitas (Recebido)</span>
              <span className="text-emerald-600 font-semibold">{fmt(totalReceived)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Despesas (Pago a Fornecedores)</span>
              <span className="text-destructive font-semibold">-{fmt(totalPaid)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Reembolsos Pagos</span>
              <span className="text-destructive font-semibold">-{fmt(totalReimbursed)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2">
              <span className="text-lg font-bold">Resultado Líquido</span>
              <span className={`text-lg font-bold ${netResult >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(netResult)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Contas Pagas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{payables.filter(p => p.status === "paid").length}</p>
            <p className="text-xs text-muted-foreground">de {payables.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Faturas Recebidas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{receivables.filter(r => r.status === "paid").length}</p>
            <p className="text-xs text-muted-foreground">de {receivables.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Reembolsos Processados</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reimbursements.filter(r => r.status === "paid").length}</p>
            <p className="text-xs text-muted-foreground">de {reimbursements.length} total</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceReports;
