import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  Trash2, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Database,
  Pencil,
  Plus,
  X
} from "lucide-react";
import { getPendingChanges, removePendingChange, PendingChange } from "@/lib/offlineStorage";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PendingChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: () => Promise<void>;
  isSyncing: boolean;
}

export function PendingChangesDialog({
  open,
  onOpenChange,
  onSync,
  isSyncing,
}: PendingChangesDialogProps) {
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadChanges();
    }
  }, [open]);

  const loadChanges = async () => {
    setLoading(true);
    const pendingChanges = await getPendingChanges();
    setChanges(pendingChanges);
    setLoading(false);
  };

  const handleDiscardChange = async (id: number) => {
    await removePendingChange(id);
    toast({
      title: "Alteração descartada",
      description: "A alteração foi removida da fila de sincronização.",
    });
    await loadChanges();
  };

  const handleDiscardAll = async () => {
    for (const change of changes) {
      if (change.id) {
        await removePendingChange(change.id);
      }
    }
    toast({
      title: "Todas as alterações descartadas",
      description: "A fila de sincronização foi limpa.",
    });
    await loadChanges();
    onOpenChange(false);
  };

  const handleSync = async () => {
    await onSync();
    await loadChanges();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "create":
        return <Plus className="h-4 w-4 text-green-500" />;
      case "update":
        return <Pencil className="h-4 w-4 text-blue-500" />;
      case "delete":
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "create":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Criar</Badge>;
      case "update":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Atualizar</Badge>;
      case "delete":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Excluir</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const translateTable = (table: string) => {
    const translations: Record<string, string> = {
      tasks: "Tarefas",
      service_orders: "Ordens de Serviço",
      time_entries: "Registros de Tempo",
      task_reports: "Relatórios",
    };
    return translations[table] || table;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Alterações Pendentes
          </DialogTitle>
          <DialogDescription>
            {changes.length === 0
              ? "Não há alterações pendentes de sincronização."
              : `${changes.length} alteração(ões) aguardando sincronização.`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : changes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-muted-foreground">Tudo sincronizado!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-3">
              {changes.map((change) => (
                <div
                  key={change.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="mt-0.5">{getTypeIcon(change.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(change.type)}
                      <span className="text-sm font-medium">
                        {translateTable(change.table)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      ID: {change.entityId}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(change.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                      {change.attempts > 0 && (
                        <span className="flex items-center gap-1 text-orange-500">
                          <AlertTriangle className="h-3 w-3" />
                          {change.attempts} tentativa(s)
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => change.id && handleDiscardChange(change.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {changes.length > 0 && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleDiscardAll}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Descartar Todas
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {changes.length > 0 && (
            <Button onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar Agora
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
