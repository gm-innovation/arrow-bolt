import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useFinancePayables } from "@/hooks/useFinance";
import NewPayableDialog from "@/components/finance/NewPayableDialog";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  pending: "Pendente", approved: "Aprovada", partial: "Parcial", paid: "Paga", overdue: "Vencida", cancelled: "Cancelada",
};

const FinancePayables = () => {
  const { payables, isLoading, updatePayable } = useFinancePayables();
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const filtered = payables.filter((p) => {
    const matchSearch = p.supplier_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Contas a Pagar</h2>
          <p className="text-muted-foreground">Gestão de pagamentos a fornecedores</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" /> Nova Conta</Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="approved">Aprovada</SelectItem>
            <SelectItem value="paid">Paga</SelectItem>
            <SelectItem value="overdue">Vencida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>Listagem</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma conta a pagar encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.supplier_name}</TableCell>
                    <TableCell>{p.invoice_number || "—"}</TableCell>
                    <TableCell className="text-right">{fmt(Number(p.amount))}</TableCell>
                    <TableCell>{format(new Date(p.due_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "paid" ? "default" : p.status === "overdue" ? "destructive" : "secondary"}>
                        {statusLabels[p.status] || p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => updatePayable.mutate({ id: p.id, status: "approved" })}>Aprovar</Button>
                      )}
                      {p.status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => updatePayable.mutate({ id: p.id, status: "paid", payment_date: new Date().toISOString().split("T")[0], paid_amount: p.amount })}>Pagar</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewPayableDialog open={showNew} onOpenChange={setShowNew} />
    </div>
  );
};

export default FinancePayables;
