import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Receipt } from "lucide-react";
import { useFinanceReimbursements } from "@/hooks/useFinance";
import NewReimbursementDialog from "@/components/finance/NewReimbursementDialog";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado", paid: "Pago", cancelled: "Cancelado",
};

const FinanceReimbursements = () => {
  const { reimbursements, isLoading, updateReimbursement } = useFinanceReimbursements();
  const [showNew, setShowNew] = useState(false);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reembolsos</h2>
          <p className="text-muted-foreground">Solicitações e controle de reembolsos</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" /> Solicitar Reembolso</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Listagem</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : reimbursements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhum reembolso encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data Despesa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reimbursements.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.requester?.full_name || "—"}</TableCell>
                    <TableCell className="font-medium">{r.description}</TableCell>
                    <TableCell className="text-right">{fmt(Number(r.amount))}</TableCell>
                    <TableCell>{format(new Date(r.expense_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "paid" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                        {statusLabels[r.status] || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateReimbursement.mutate({ id: r.id, status: "approved" })}>Aprovar</Button>
                          <Button size="sm" variant="ghost" onClick={() => updateReimbursement.mutate({ id: r.id, status: "rejected", rejection_reason: "Não aprovado" })}>Rejeitar</Button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => updateReimbursement.mutate({ id: r.id, status: "paid" })}>Pagar</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewReimbursementDialog open={showNew} onOpenChange={setShowNew} />
    </div>
  );
};

export default FinanceReimbursements;
