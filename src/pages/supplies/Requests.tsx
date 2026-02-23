import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePurchaseRequests, type PurchaseRequest } from "@/hooks/usePurchaseRequests";
import NewPurchaseRequestDialog from "@/components/supplies/NewPurchaseRequestDialog";
import ViewPurchaseRequestDialog from "@/components/supplies/ViewPurchaseRequestDialog";

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

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
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

const SuppliesRequests = () => {
  const { requests, isLoading, deleteRequest } = usePurchaseRequests();
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = requests.filter((r) => {
    const matchesSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.requester?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Solicitações de Compra</h2>
          <p className="text-muted-foreground">Gerencie suas solicitações de materiais e serviços</p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Solicitação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou solicitante..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma solicitação encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead className="text-right">Valor Est.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((req) => (
                    <TableRow
                      key={req.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedRequest(req)}
                    >
                      <TableCell className="font-medium">{req.title}</TableCell>
                      <TableCell>{req.requester?.full_name || "—"}</TableCell>
                      <TableCell>{categoryLabels[req.category] || req.category}</TableCell>
                      <TableCell>
                        <Badge variant={req.priority === "urgente" ? "destructive" : "secondary"}>
                          {priorityLabels[req.priority] || req.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(req.estimated_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[req.status] || "secondary"}>
                          {statusLabels[req.status] || req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(req.created_at), "dd/MM/yy", { locale: ptBR })}</TableCell>
                      <TableCell>
                        {req.status === "draft" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRequest.mutate(req.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NewPurchaseRequestDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />
      <ViewPurchaseRequestDialog
        request={selectedRequest}
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      />
    </div>
  );
};

export default SuppliesRequests;
