import { WifiOff, RefreshCw, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cn } from "@/lib/utils";

export const OfflineIndicator = () => {
  const { isOnline, isSyncing, pendingCount, forceSync } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all",
        !isOnline 
          ? "bg-destructive text-destructive-foreground" 
          : "bg-primary text-primary-foreground"
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Modo Offline</span>
          {pendingCount > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Sincronizando...</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Cloud className="h-4 w-4" />
          <span className="text-sm font-medium">
            {pendingCount} alteração{pendingCount > 1 ? 'ões' : ''} pendente{pendingCount > 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-6 px-2 text-xs"
            onClick={forceSync}
          >
            Sincronizar
          </Button>
        </>
      ) : null}
    </div>
  );
};
