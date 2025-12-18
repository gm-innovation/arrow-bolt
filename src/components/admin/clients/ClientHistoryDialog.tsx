import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Ship, Calendar, FileText, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

type ClientHistoryEntry = {
  id: string;
  date: Date;
  type: "service" | "vessel";
  description: string;
  vesselName?: string;
  orderNumber?: string;
  status?: string;
};

interface ClientHistoryDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClientHistoryDialog = ({
  clientId,
  clientName,
  open,
  onOpenChange,
}: ClientHistoryDialogProps) => {
  const [history, setHistory] = useState<ClientHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && clientId) {
      fetchHistory();
    }
  }, [open, clientId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Fetch service orders for this client
      const { data: serviceOrders, error: soError } = await supabase
        .from('service_orders')
        .select('id, order_number, status, created_at, vessels(name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (soError) throw soError;

      // Fetch vessels for this client
      const { data: vessels, error: vError } = await supabase
        .from('vessels')
        .select('id, name, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (vError) throw vError;

      // Combine and format history entries
      const historyEntries: ClientHistoryEntry[] = [];

      // Add service orders
      serviceOrders?.forEach((so) => {
        const statusLabels: Record<string, string> = {
          pending: 'Pendente',
          scheduled: 'Agendada',
          in_progress: 'Em Andamento',
          completed: 'Concluída',
          cancelled: 'Cancelada',
        };
        historyEntries.push({
          id: `so-${so.id}`,
          date: parseISO(so.created_at),
          type: 'service',
          description: `OS ${so.order_number} - ${statusLabels[so.status || ''] || so.status}`,
          vesselName: so.vessels?.name,
          orderNumber: so.order_number,
          status: so.status,
        });
      });

      // Add vessels
      vessels?.forEach((v) => {
        historyEntries.push({
          id: `v-${v.id}`,
          date: parseISO(v.created_at),
          type: 'vessel',
          description: `Embarcação cadastrada: ${v.name}`,
          vesselName: v.name,
        });
      });

      // Sort by date descending
      historyEntries.sort((a, b) => b.date.getTime() - a.date.getTime());

      setHistory(historyEntries);
    } catch (error) {
      console.error('Error fetching client history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-600';
      case 'in_progress':
        return 'bg-blue-100 text-blue-600';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico - {clientName}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum histórico encontrado para este cliente
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {entry.type === "service" ? (
                    <div className={`p-2 rounded-full ${getStatusColor(entry.status)}`}>
                      <FileText className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="bg-green-100 p-2 rounded-full">
                      <Ship className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{entry.description}</p>
                    {entry.vesselName && entry.type === 'service' && (
                      <p className="text-sm text-muted-foreground">
                        Embarcação: {entry.vesselName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(entry.date, "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
