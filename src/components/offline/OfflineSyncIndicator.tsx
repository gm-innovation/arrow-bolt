import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database,
  CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { PendingChangesDialog } from "./PendingChangesDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OfflineSyncIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function OfflineSyncIndicator({ 
  className, 
  showLabel = false 
}: OfflineSyncIndicatorProps) {
  const { isOnline, isSyncing, pendingCount, forceSync } = useOfflineSync();
  const [dialogOpen, setDialogOpen] = useState(false);

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-destructive" />;
    }
    if (isSyncing) {
      return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
    }
    if (pendingCount > 0) {
      return <Database className="h-4 w-4 text-orange-500" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) return "Offline";
    if (isSyncing) return "Sincronizando...";
    if (pendingCount > 0) return `${pendingCount} pendente(s)`;
    return "Sincronizado";
  };

  const getStatusColor = () => {
    if (!isOnline) return "text-destructive";
    if (isSyncing) return "text-primary";
    if (pendingCount > 0) return "text-orange-500";
    return "text-green-500";
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2 h-8",
                pendingCount > 0 && "hover:bg-orange-500/10"
              )}
              onClick={() => pendingCount > 0 && setDialogOpen(true)}
              disabled={!isOnline && pendingCount === 0}
            >
              {getStatusIcon()}
              {showLabel && (
                <span className={cn("text-xs", getStatusColor())}>
                  {getStatusText()}
                </span>
              )}
              {pendingCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="h-5 min-w-[20px] px-1.5 bg-orange-500/20 text-orange-600"
                >
                  {pendingCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getStatusText()}</p>
            {pendingCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Clique para ver detalhes
              </p>
            )}
          </TooltipContent>
        </Tooltip>

        {!isOnline && (
          <Badge variant="destructive" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Offline
          </Badge>
        )}

        <PendingChangesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSync={forceSync}
          isSyncing={isSyncing}
        />
      </div>
    </TooltipProvider>
  );
}
