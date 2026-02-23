import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpCircle, ArrowDownCircle, Receipt, TrendingUp } from "lucide-react";
import { useFinancePayables, useFinanceReceivables, useFinanceReimbursements } from "@/hooks/useFinance";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const FinanceDashboard = () => {
  const { payables } = useFinancePayables();
  const { receivables } = useFinanceReceivables();
  const { reimbursements } = useFinanceReimbursements();

  const pendingPayables = payables.filter((p) => ["pending", "approved"].includes(p.status));
  const pendingReceivables = receivables.filter((r) => ["invoiced", "partial"].includes(r.status));
  const pendingReimbursements = reimbursements.filter((r) => r.status === "pending");

  const totalPayable = pendingPayables.reduce((sum, p) => sum + (Number(p.amount) - Number(p.paid_amount)), 0);
  const totalReceivable = pendingReceivables.reduce((sum, r) => sum + (Number(r.amount) - Number(r.received_amount)), 0);
  const totalReimbursements = pendingReimbursements.reduce((sum, r) => sum + Number(r.amount), 0);
  const balance = totalReceivable - totalPayable - totalReimbursements;

  const today = new Date().toISOString().split("T")[0];
  const overduePayables = payables.filter((p) => ["pending", "approved"].includes(p.status) && p.due_date < today);
  const overdueReceivables = receivables.filter((r) => ["invoiced", "partial"].includes(r.status) && r.due_date < today);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Financeiro</h2>
        <p className="text-muted-foreground">Controle financeiro interno</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{fmt(totalPayable)}</div>
            <p className="text-xs text-muted-foreground">{overduePayables.length} vencidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{fmt(totalReceivable)}</div>
            <p className="text-xs text-muted-foreground">{overdueReceivables.length} vencidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reembolsos Pendentes</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalReimbursements)}</div>
            <p className="text-xs text-muted-foreground">{pendingReimbursements.length} solicitações</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Projetado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(balance)}</div>
            <p className="text-xs text-muted-foreground">receber - pagar - reembolsos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Próximos Vencimentos</CardTitle></CardHeader>
        <CardContent>
          {overduePayables.length === 0 && overdueReceivables.length === 0 && pendingPayables.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum vencimento próximo.</p>
          ) : (
            <div className="space-y-3">
              {overduePayables.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/30">
                  <div>
                    <p className="text-sm font-medium">Pagar: {p.supplier_name}</p>
                    <p className="text-xs text-muted-foreground">Venceu em {format(new Date(p.due_date), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">{fmt(Number(p.amount))}</p>
                    <Badge variant="destructive">Vencida</Badge>
                  </div>
                </div>
              ))}
              {overdueReceivables.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30">
                  <div>
                    <p className="text-sm font-medium">Receber: {r.client_name}</p>
                    <p className="text-xs text-muted-foreground">Venceu em {format(new Date(r.due_date), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{fmt(Number(r.amount))}</p>
                    <Badge variant="secondary">Vencida</Badge>
                  </div>
                </div>
              ))}
              {pendingPayables.filter(p => !overduePayables.includes(p)).slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Pagar: {p.supplier_name}</p>
                    <p className="text-xs text-muted-foreground">Vence em {format(new Date(p.due_date), "dd/MM/yyyy")}</p>
                  </div>
                  <p className="font-semibold">{fmt(Number(p.amount))}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceDashboard;
