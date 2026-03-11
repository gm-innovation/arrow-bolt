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
import { Loader2, Download, Search, AlertCircle, CheckCircle2, Ship, Users, Calendar, MapPin, ClipboardList } from "lucide-react";

export interface OmieImportData {
  orderNumber: string;
  omieOsId: number;
  omieIntegrationCode: string;
  clientOmieId?: number;
  clientName?: string;
  localClientId?: string;
  localVesselId?: string;
  localVesselName?: string;
  serviceDescription?: string;
  // AI-extracted fields
  serviceDateTime?: string;
  plannedLocation?: string;
  matchedRequesterId?: string;
  matchedRequesterName?: string;
  matchedSupervisorId?: string;
  matchedSupervisorName?: string;
  matchedCoordinatorId?: string;
  matchedCoordinatorName?: string;
  matchedTechnicianIds?: string[];
  matchedTechnicianNames?: string[];
  matchedTaskTypeIds?: string[];
  matchedTaskTypeNames?: string[];
  scopeDescription?: string;
}

interface OmieImportDialogProps {
  onSelectOrder: (order: OmieImportData) => void;
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
    const parsed = foundOrder.parsedData || {};

    onSelectOrder({
      orderNumber: cab.cNumOS || cab.nCodOS?.toString() || "",
      omieOsId: cab.nCodOS || 0,
      omieIntegrationCode: cab.cCodIntOS || "",
      clientOmieId: cab.nCodCli,
      clientName: foundOrder.localClient?.name || info.cNomeCliente || "",
      localClientId: foundOrder.localClient?.id,
      localVesselId: foundOrder.localVessel?.id,
      localVesselName: foundOrder.localVessel?.name,
      serviceDescription: foundOrder.serviceDescription || "",
      // AI-extracted fields
      serviceDateTime: parsed.serviceDateTime,
      plannedLocation: parsed.location,
      matchedRequesterId: parsed.matchedRequester?.id,
      matchedRequesterName: parsed.matchedRequester?.name,
      matchedSupervisorId: parsed.matchedSupervisor?.id,
      matchedSupervisorName: parsed.matchedSupervisor?.name,
      matchedCoordinatorId: parsed.matchedCoordinator?.id,
      matchedCoordinatorName: parsed.matchedCoordinator?.name,
      matchedTechnicianIds: parsed.matchedTechnicians?.map((t: any) => t.id),
      matchedTechnicianNames: parsed.matchedTechnicians?.map((t: any) => t.name),
      matchedTaskTypeIds: parsed.matchedTaskTypes?.map((t: any) => t.id),
      matchedTaskTypeNames: parsed.matchedTaskTypes?.map((t: any) => t.name),
      scopeDescription: parsed.scopeDescription,
    });
    setOpen(false);
  };

  // Extract raw AI data for display (before matching)
  const rawAiData = foundOrder?.parsedData?._rawExtracted || {};
  const aiExtracted = foundOrder?.parsedData || {};

  const cab = foundOrder?.Cabecalho || {};
  const info = foundOrder?.InformacoesAdicionais || {};
  const localClient = foundOrder?.localClient;
  const localVessel = foundOrder?.localVessel;
  const serviceDesc = foundOrder?.serviceDescription || "";
  const parsed = foundOrder?.parsedData || {};

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
              <div className="flex items-center gap-2">
                <strong className="text-foreground">Cliente:</strong> 
                <span>{localClient?.name || info.cNomeCliente || "Não identificado"}</span>
                {localClient && <Badge variant="success" size="sm">Vinculado</Badge>}
              </div>
              {localVessel && (
                <div className="flex items-center gap-2">
                  <Ship className="h-3.5 w-3.5" />
                  <strong className="text-foreground">Embarcação:</strong>
                  <span>{localVessel.name}</span>
                  {localVessel.autoCreated ? (
                    <Badge variant="outline" size="sm" className="text-amber-600 border-amber-400">Cadastrada ✨</Badge>
                  ) : (
                    <Badge variant="success" size="sm">Vinculada</Badge>
                  )}
                </div>
              )}
              {cab.nCodCli && (
                <p><strong className="text-foreground">Cód. Cliente:</strong> {cab.nCodCli}</p>
              )}
              {cab.cCodIntOS && (
                <p><strong className="text-foreground">Cód. Integração:</strong> {cab.cCodIntOS}</p>
              )}
              {serviceDesc && (
                <div className="mt-2 pt-2 border-t">
                  <strong className="text-foreground">Descrição do Serviço:</strong>
                  <p className="mt-1 text-xs whitespace-pre-line line-clamp-4">{serviceDesc}</p>
                </div>
              )}

              {/* AI-extracted data preview */}
              {Object.keys(parsed).length > 0 && (
                <div className="mt-2 pt-2 border-t space-y-1">
                  <strong className="text-foreground text-xs flex items-center gap-1">
                    🤖 Dados extraídos por IA:
                  </strong>
                  {parsed.serviceDateTime && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(parsed.serviceDateTime).toLocaleString('pt-BR')}</span>
                      <Badge variant="success" size="sm">Auto</Badge>
                    </div>
                  )}
                  {parsed.location && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <MapPin className="h-3 w-3" />
                      <span>{parsed.location}</span>
                    </div>
                  )}
                  {parsed.matchedTechnicians?.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Users className="h-3 w-3" />
                      <span>{parsed.matchedTechnicians.map((t: any) => t.name).join(", ")}</span>
                      <Badge variant="success" size="sm">Vinculados</Badge>
                    </div>
                  )}
                    {parsed.matchedRequester && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span>📋 Solicitante: {parsed.matchedRequester.name}</span>
                        {parsed.matchedRequester.autoCreated ? (
                          <Badge variant="outline" size="sm" className="text-amber-600 border-amber-400">Cadastrado ✨</Badge>
                        ) : (
                          <Badge variant="success" size="sm">Vinculado</Badge>
                        )}
                      </div>
                    )}
                  {parsed.matchedSupervisor && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span>👷 Supervisor: {parsed.matchedSupervisor.name}</span>
                      <Badge variant="success" size="sm">Vinculado</Badge>
                    </div>
                  )}
                  {parsed.matchedCoordinator && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span>📌 Coordenador: {parsed.matchedCoordinator.name}</span>
                      <Badge variant="success" size="sm">Vinculado</Badge>
                    </div>
                  )}
                  {parsed.matchedTaskTypes?.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <ClipboardList className="h-3 w-3" />
                      <span>{parsed.matchedTaskTypes.map((t: any) => t.name).join(", ")}</span>
                    </div>
                  )}
                </div>
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
