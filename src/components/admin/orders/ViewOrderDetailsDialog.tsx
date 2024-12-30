import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface ViewOrderDetailsDialogProps {
  orderId: string;
}

export const ViewOrderDetailsDialog = ({ orderId }: ViewOrderDetailsDialogProps) => {
  // Mock data - replace with real API call
  const orderDetails = {
    id: orderId,
    client: "Petrobras",
    vessel: "Navio Alpha",
    technicians: ["João Silva", "Maria Santos"],
    supervisor: "Paulo Supervisor",
    status: "Em Andamento",
    createdAt: new Date("2024-03-15"),
    scheduledDate: new Date("2024-03-20"),
    location: "Porto de Santos",
    description: "Manutenção preventiva do motor principal",
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Detalhes da Ordem de Serviço</DialogTitle>
        <DialogDescription>
          OS #{orderId}
        </DialogDescription>
      </DialogHeader>
      
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium">Informações Básicas</h4>
            <Separator className="my-2" />
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Cliente:</dt>
                <dd className="text-sm">{orderDetails.client}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Embarcação:</dt>
                <dd className="text-sm">{orderDetails.vessel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Status:</dt>
                <dd className="text-sm">{orderDetails.status}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="text-sm font-medium">Datas</h4>
            <Separator className="my-2" />
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Criação:</dt>
                <dd className="text-sm">{format(orderDetails.createdAt, "dd/MM/yyyy")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Agendamento:</dt>
                <dd className="text-sm">{format(orderDetails.scheduledDate, "dd/MM/yyyy HH:mm")}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="text-sm font-medium">Equipe</h4>
            <Separator className="my-2" />
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Supervisor:</dt>
                <dd className="text-sm">{orderDetails.supervisor}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Técnicos:</dt>
                <dd className="text-sm">{orderDetails.technicians.join(", ")}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="text-sm font-medium">Detalhes do Serviço</h4>
            <Separator className="my-2" />
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Local:</dt>
                <dd className="text-sm">{orderDetails.location}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">Descrição:</dt>
                <dd className="text-sm">{orderDetails.description}</dd>
              </div>
            </dl>
          </div>
        </div>
      </ScrollArea>
    </DialogContent>
  );
};