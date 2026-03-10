import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePurchaseRequests, usePurchaseRequestItems, type PurchaseRequest } from "@/hooks/usePurchaseRequests";
import { useAuth } from "@/contexts/AuthContext";

interface ViewPurchaseRequestDialogProps {
  request: PurchaseRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  pending_manager: "Aguardando Gerente",
  pending_director: "Aguardando Diretoria",
  approved: "Aprovada",
  in_progress: "Em Andamento",
  completed: "Concluída",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
};

const statusColors: Record<string, string> = {
  draft: "secondary",
  pending_manager: "outline",
  pending_director: "outline",
  approved: "default",
  in_progress: "default",
  completed: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

const priorityLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const categoryLabels: Record<string, string> = {
  material: "Material",
  servico: "Serviço",
  equipamento: "Equipamento",
  epi: "EPI",
  outros: "Outros",
};

const ViewPurchaseRequestDialog = ({ request, open, onOpenChange }: ViewPurchaseRequestDialogProps) => {
  const { userRole } = useAuth();
  const { updateStatus } = usePurchaseRequests();
  const { items, isLoading: itemsLoading } = usePurchaseRequestItems(request?.id || null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!request) return null;

  const canApprove =
    (request.status === "pending_manager" && (userRole === "manager" || userRole === "super_admin" || userRole === "director")) ||
    (request.status === "pending_director" && (userRole === "director" || userRole === "super_admin"));

  const canReject = canApprove;

  const handleApprove = () => {
    const nextStatus = request.status === "pending_manager" ? "approved" : "approved";
    updateStatus.mutate({ id: request.id, status: nextStatus });
    onOpenChange(false);
  };

  const handleReject = () => {
    updateStatus.mutate({ id: request.id, status: "rejected", rejection_reason: rejectionReason });
    setShowRejectForm(false);
    setRejectionReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {request.title}
            <Badge variant={statusColors[request.status] as "default" | "secondary" | "destructive" | "outline"}>
              {statusLabels[request.status] || request.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Solicitante:</span>
              <p className="font-medium">{request.requester?.full_name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Data:</span>
              <p className="font-medium">{format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Categoria:</span>
              <p className="font-medium">{categoryLabels[request.category] || request.category}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Prioridade:</span>
              <p className="font-medium">{priorityLabels[request.priority] || request.priority}</p>
            </div>
          </div>

          {request.description && (
            <div>
              <span className="text-sm text-muted-foreground">Descrição:</span>
              <p className="text-sm mt-1">{request.description}</p>
            </div>
          )}

          {request.justification && (
            <div>
              <span className="text-sm text-muted-foreground">Justificativa:</span>
              <p className="text-sm mt-1">{request.justification}</p>
            </div>
          )}

          {request.rejection_reason && (
            <div className="p-3 bg-destructive/10 rounded-md">
              <span className="text-sm font-medium text-destructive">Motivo da Rejeição:</span>
              <p className="text-sm mt-1">{request.rejection_reason}</p>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Itens</h4>
            {itemsLoading ? (
              <p className="text-muted-foreground text-sm">Carregando itens...</p>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum item cadastrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Un</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">
                        {Number(item.estimated_unit_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell className="text-right">
                        {(Number(item.quantity) * Number(item.estimated_unit_price)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="text-right font-semibold mt-2">
              Total Estimado: {Number(request.estimated_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </div>

          {showRejectForm && (
            <div className="space-y-2">
              <Label>Motivo da Rejeição *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Informe o motivo..."
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {canReject && !showRejectForm && (
            <Button variant="destructive" onClick={() => setShowRejectForm(true)}>
              Rejeitar
            </Button>
          )}
          {showRejectForm && (
            <>
              <Button variant="outline" onClick={() => setShowRejectForm(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim()}>
                Confirmar Rejeição
              </Button>
            </>
          )}
          {canApprove && !showRejectForm && (
            <Button onClick={handleApprove}>Aprovar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewPurchaseRequestDialog;
