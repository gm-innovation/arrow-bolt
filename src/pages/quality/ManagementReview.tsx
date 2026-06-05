import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, FileText } from "lucide-react";
import { useManagementReviews, ReviewStatus } from "@/hooks/useManagementReviews";
import { format, parseISO } from "date-fns";

const statusLabel: Record<ReviewStatus, string> = {
  draft: "Rascunho",
  in_progress: "Em andamento",
  closed: "Fechada",
};

const statusVariant: Record<ReviewStatus, "default" | "secondary" | "outline"> = {
  draft: "outline",
  in_progress: "secondary",
  closed: "default",
};

const ManagementReview = () => {
  const { reviews, isLoading, create } = useManagementReviews();
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [form, setForm] = useState({
    review_date: format(today, "yyyy-MM-dd"),
    period_start: format(new Date(today.getFullYear(), today.getMonth() - 12, 1), "yyyy-MM-dd"),
    period_end: format(today, "yyyy-MM-dd"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análise Crítica pela Direção</h2>
          <p className="text-muted-foreground">ISO 9001 — Cláusula 9.3</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova reunião
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reuniões</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhuma reunião registrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Presidente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead>Saídas abertas</TableHead>
                  <TableHead>Próxima prevista</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{format(parseISO(r.review_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-xs">
                      {format(parseISO(r.period_start), "dd/MM/yy")} → {format(parseISO(r.period_end), "dd/MM/yy")}
                    </TableCell>
                    <TableCell>{r.chair?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                    </TableCell>
                    <TableCell>{r.closed_at ? format(parseISO(r.closed_at), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>{r.open_outputs_count ?? 0}</TableCell>
                    <TableCell>{r.next_due_date ? format(parseISO(r.next_due_date), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>
                      <Link to={`/quality/management-review/${r.id}`}>
                        <Button variant="ghost" size="sm">Abrir</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova reunião de análise crítica</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Data da reunião</Label>
              <Input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Início do período</Label>
                <Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
              </div>
              <div>
                <Label>Fim do período</Label>
                <Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                await create.mutateAsync(form);
                setOpen(false);
              }}
              disabled={create.isPending}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagementReview;
