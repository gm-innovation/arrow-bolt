import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useFinanceReceivables } from "@/hooks/useFinance";
import NewReceivableDialog from "@/components/finance/NewReceivableDialog";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  invoiced: "Faturada", partial: "Parcial", paid: "Recebida", overdue: "Vencida", cancelled: "Cancelada",
};

const FinanceReceivables = () => {
  const { receivables, isLoading, updateReceivable } = useFinanceReceivables();
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const filtered = receivables.filter((r) => {
    const matchSearch = r.client_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Contas a Receber</h2>
          <p className="text-muted-foreground">Faturamento e acompanhamento de recebimentos</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" /> Nova Conta</Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="invoiced">Faturada</SelectItem>
            <SelectItem value="partial">Parcial</SelectItem>
            <SelectItem value="paid">Recebida</SelectItem>
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
            <p className="text-muted-foreground text-center py-8">Nenhuma conta a receber encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fatura</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.client_name}</TableCell>
                    <TableCell>{r.invoice_number || "—"}</TableCell>
                    <TableCell className="text-right">{fmt(Number(r.amount))}</TableCell>
                    <TableCell>{format(new Date(r.due_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "paid" ? "default" : r.status === "overdue" ? "destructive" : "secondary"}>
                        {statusLabels[r.status] || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(r.status === "invoiced" || r.status === "partial") && (
                        <Button size="sm" variant="outline" onClick={() => updateReceivable.mutate({ id: r.id, status: "paid", received_amount: r.amount, received_date: new Date().toISOString().split("T")[0] })}>
                          Receber
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewReceivableDialog open={showNew} onOpenChange={setShowNew} />
    </div>
  );
};

export default FinanceReceivables;
