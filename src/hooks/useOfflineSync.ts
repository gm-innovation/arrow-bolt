import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  getPendingChanges, 
  removePendingChange, 
  incrementAttempts,
  clearExpiredCache,
  PendingChange
} from '@/lib/offlineStorage';
import { useToast } from '@/hooks/use-toast';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Conexão restaurada",
        description: "Sincronizando dados...",
      });
      syncPendingChanges();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Você está offline",
        description: "As alterações serão salvas localmente.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    if (navigator.onLine) {
      syncPendingChanges();
    }

    // Periodically check pending changes
    const interval = setInterval(updatePendingCount, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = async () => {
    const changes = await getPendingChanges();
    setPendingCount(changes.length);
  };

  const syncPendingChanges = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    
    try {
      const changes = await getPendingChanges();
      setPendingCount(changes.length);

      if (changes.length === 0) {
        setIsSyncing(false);
        return;
      }

      console.log(`[Sync] Processing ${changes.length} pending changes`);

      for (const change of changes) {
        try {
          await processChange(change);
          await removePendingChange(change.id!);
          console.log(`[Sync] Successfully synced change ${change.id}`);
        } catch (error) {
          console.error(`[Sync] Failed to sync change ${change.id}:`, error);
          await incrementAttempts(change.id!);
          
          // Remove changes that have failed too many times
          if (change.attempts >= 5) {
            await removePendingChange(change.id!);
            console.warn(`[Sync] Removed change ${change.id} after 5 failed attempts`);
          }
        }
      }

      // Clean up expired cache
      await clearExpiredCache();

      await updatePendingCount();

      toast({
        title: "Sincronização concluída",
        description: "Todos os dados foram sincronizados.",
      });
    } catch (error) {
      console.error('[Sync] Error during sync:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, toast]);

  const processChange = async (change: PendingChange) => {
    const { type, table, entityId, data } = change;

    switch (type) {
      case 'create':
        const { error: createError } = await supabase
          .from(table as any)
          .insert(data);
        if (createError) throw createError;
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from(table as any)
          .update(data)
          .eq('id', entityId);
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table as any)
          .delete()
          .eq('id', entityId);
        if (deleteError) throw deleteError;
        break;
    }
  };

  const forceSync = useCallback(async () => {
    if (!navigator.onLine) {
      toast({
        title: "Sem conexão",
        description: "Aguarde a conexão ser restabelecida.",
        variant: "destructive",
      });
      return;
    }
    await syncPendingChanges();
  }, [syncPendingChanges, toast]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    forceSync,
  };
};
