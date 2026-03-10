import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOmieIntegration } from "@/hooks/useOmieIntegration";
import { Loader2, Download, Search } from "lucide-react";

interface OmieImportDialogProps {
  onSelectOrder: (order: {
    orderNumber: string;
    omieOsId: number;
    omieIntegrationCode: string;
    clientOmieId?: number;
    clientName?: string;
  }) => void;
}

export const OmieImportDialog = ({ onSelectOrder }: OmieImportDialogProps) => {
  const { listOrders } = useOmieIntegration();
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && orders.length === 0) {
      await loadOrders();
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const result = await listOrders.mutateAsync({ page: 1 });
      setOrders(result.orders || []);
    } catch {
      // error handled by hook
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (order: any) => {
    const cabecalho = order.Cabecalho || {};
    const cliente = order.InformacoesAdicionais || {};
    
    onSelectOrder({
      orderNumber: cabecalho.cNumOS || cabecalho.nCodOS?.toString() || "",
      omieOsId: cabecalho.nCodOS || 0,
      omieIntegrationCode: cabecalho.cCodIntOS || "",
      clientOmieId: cabecalho.nCodCli,
      clientName: cliente.cNomeCliente || "",
    });
    setOpen(false);
  };

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const cab = o.Cabecalho || {};
    const info = o.InformacoesAdicionais || {};
    const searchLower = search.toLowerCase();
    return (
      (cab.cNumOS || "").toLowerCase().includes(searchLower) ||
      (cab.nCodOS?.toString() || "").includes(searchLower) ||
      (info.cNomeCliente || "").toLowerCase().includes(searchLower)
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Importar do Omie
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar OS do Omie</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nº OS ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma OS encontrada
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((order: any, idx: number) => {
                const cab = order.Cabecalho || {};
                const info = order.InformacoesAdicionais || {};
                return (
                  <button
                    key={cab.nCodOS || idx}
                    type="button"
                    onClick={() => handleSelect(order)}
                    className="w-full text-left p-3 rounded-md border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        OS #{cab.cNumOS || cab.nCodOS}
                      </span>
                      <Badge variant="secondary">
                        {cab.cEtapa || "—"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {info.cNomeCliente || "Cliente não identificado"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <Button variant="outline" onClick={loadOrders} disabled={loading}>
          <Loader2 className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Recarregar
        </Button>
      </DialogContent>
    </Dialog>
  );
};
