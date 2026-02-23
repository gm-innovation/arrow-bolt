import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Clock, CheckCircle, XCircle } from "lucide-react";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ViewPurchaseRequestDialog from "@/components/supplies/ViewPurchaseRequestDialog";
import type { PurchaseRequest } from "@/hooks/usePurchaseRequests";

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

const SuppliesDashboard = () => {
  const { requests, isLoading } = usePurchaseRequests();
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);

  const pending = requests.filter((r) => r.status.startsWith("pending_"));
  const approved = requests.filter((r) => r.status === "approved" || r.status === "in_progress");
  const rejected = requests.filter((r) => r.status === "rejected");
  const recent = requests.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Suprimentos</h2>
        <p className="text-muted-foreground">Gestão de solicitações de compra</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approved.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitadas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejected.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : recent.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma solicitação de compra ainda.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedRequest(req)}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{req.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {req.requester?.full_name} • {format(new Date(req.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-medium">
                      {Number(req.estimated_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <Badge variant="outline">{statusLabels[req.status] || req.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ViewPurchaseRequestDialog
        request={selectedRequest}
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      />
    </div>
  );
};

export default SuppliesDashboard;
