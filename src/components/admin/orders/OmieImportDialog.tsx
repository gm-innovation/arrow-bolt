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
import { useOmieIntegration } from "@/hooks/useOmieIntegration";
import { Loader2, Download, Search, AlertCircle, CheckCircle2 } from "lucide-react";

interface OmieImportDialogProps {
  onSelectOrder: (order: {
    orderNumber: string;
    omieOsId: number;
    omieIntegrationCode: string;
    clientOmieId?: number;
    clientName?: string;
    localClientId?: string;
  }) => void;
}

export const OmieImportDialog = ({ onSelectOrder }: OmieImportDialogProps) => {
  const { consultOrder } = useOmieIntegration();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundOrder, setFoundOrder] = useState<any>(null);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearch("");
      setError(null);
      setFoundOrder(null);
    }
  };

  const handleSearch = async () => {
    const term = search.trim();
    if (!term) return;
    if (loading) return;

    setLoading(true);
    setError(null);
    setFoundOrder(null);

    try {
      // Try as cNumOS (text number)
      const result = await consultOrder.mutateAsync({ cNumOS: term });
      setFoundOrder(result);
    } catch (err: any) {
      const msg = err.message || "Erro ao buscar OS";
      if (msg.includes("não localizada") || msg.includes("não encontrada")) {
        setError(`OS "${term}" não encontrada no Omie. Verifique o número e tente novamente.`);
      } else if (msg.includes("REDUNDANT")) {
        setError("API do Omie em rate-limit. Aguarde alguns segundos e tente novamente.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleImport = () => {
    if (!foundOrder) return;
    const cab = foundOrder.Cabecalho || {};
    const info = foundOrder.InformacoesAdicionais || {};

    onSelectOrder({
      orderNumber: cab.cNumOS || cab.nCodOS?.toString() || "",
      omieOsId: cab.nCodOS || 0,
      omieIntegrationCode: cab.cCodIntOS || "",
      clientOmieId: cab.nCodCli,
      clientName: foundOrder.localClient?.name || info.cNomeCliente || "",
      localClientId: foundOrder.localClient?.id,
    });
    setOpen(false);
  };

  const cab = foundOrder?.Cabecalho || {};
  const info = foundOrder?.InformacoesAdicionais || {};
  const localClient = foundOrder?.localClient;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Importar do Omie
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar OS do Omie</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Digite o número da OS no Omie para importar.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nº da OS (ex: 12345)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
              autoFocus
            />
          </div>
          <Button
            type="button"
            onClick={handleSearch}
            disabled={loading || !search.trim()}
            className="shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {foundOrder && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-semibold">OS #{cab.cNumOS || cab.nCodOS}</span>
              </div>
              <Badge variant="secondary">{cab.cEtapa || "—"}</Badge>
            </div>

            <div className="text-sm space-y-1 text-muted-foreground">
              <p><strong className="text-foreground">Cliente:</strong> {info.cNomeCliente || "Não identificado"}</p>
              {cab.nCodCli && (
                <p><strong className="text-foreground">Cód. Cliente:</strong> {cab.nCodCli}</p>
              )}
              {cab.cCodIntOS && (
                <p><strong className="text-foreground">Cód. Integração:</strong> {cab.cCodIntOS}</p>
              )}
            </div>

            <Button onClick={handleImport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Importar esta OS
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
