import { useState, useCallback } from "react";
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
import { Loader2, Download, Search, AlertCircle } from "lucide-react";

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
  const { listOrders, searchOrders } = useOmieIntegration();
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !hasLoaded) {
      await loadOrders();
    }
    if (!isOpen) {
      setSearch("");
      setError(null);
    }
  };

  const loadOrders = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listOrders.mutateAsync({ page: 1 });
      setOrders(result.orders || []);
      setHasLoaded(true);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar ordens de serviço");
    } finally {
      setLoading(false);
    }
  }, [loading, listOrders]);

  const handleSearch = useCallback(async () => {
    const term = search.trim();
    if (!term) {
      // Reset to initial list
      await loadOrders();
      return;
    }
    if (searching) return;
    setSearching(true);
    setError(null);
    try {
      const result = await searchOrders.mutateAsync({ search: term });
      setOrders(result.orders || []);
    } catch (err: any) {
      setError(err.message || "Erro ao buscar ordens de serviço");
    } finally {
      setSearching(false);
    }
  }, [search, searching, searchOrders, loadOrders]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
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

  const isLoading = loading || searching;

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

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nº OS ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSearch}
            disabled={isLoading}
            className="shrink-0"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error.includes("REDUNDANT") ? "API do Omie em rate-limit. Aguarde alguns segundos e tente novamente." : error}</span>
          </div>
        )}

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Carregando OS do Omie...</span>
            </div>
          ) : orders.length === 0 && hasLoaded && !error ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma OS encontrada
            </p>
          ) : orders.length === 0 && !hasLoaded && !error ? (
            <p className="text-center text-muted-foreground py-8">
              Clique em recarregar para buscar as OS
            </p>
          ) : (
            <div className="space-y-2">
              {orders.map((order: any, idx: number) => {
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

        <Button variant="outline" onClick={loadOrders} disabled={isLoading}>
          <Loader2 className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Recarregar
        </Button>
      </DialogContent>
    </Dialog>
  );
};
