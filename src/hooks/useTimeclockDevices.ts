import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TimeclockDevice } from '@/hooks/useHRTimesheet';

export interface TimeclockSyncLog {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  punches_read: number | null;
  punches_inserted: number | null;
  error_message: string | null;
}

/**
 * Gestão dos relógios de ponto (Control iD) para uma empresa específica.
 * Usado pelo Super Admin em API & Integrações e, em leitura, pelo RH.
 */
export function useTimeclockDevices(companyId?: string | null) {
  const queryClient = useQueryClient();

  const devices = useQuery({
    queryKey: ['timeclock-devices', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_timeclock_devices')
        .select('*')
        .eq('company_id', companyId!)
        .order('name');
      if (error) throw error;
      return (data ?? []) as TimeclockDevice[];
    },
  });

  const syncLogs = useQuery({
    queryKey: ['timeclock-sync-logs', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_timeclock_sync_logs')
        .select('*')
        .eq('company_id', companyId!)
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as TimeclockSyncLog[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['timeclock-devices'] });
    queryClient.invalidateQueries({ queryKey: ['timeclock-sync-logs'] });
    queryClient.invalidateQueries({ queryKey: ['hr-timeclock-devices'] });
    queryClient.invalidateQueries({ queryKey: ['hr-timeclock-logs'] });
  };

  const saveDevice = useMutation({
    mutationFn: async (values: Partial<TimeclockDevice> & { name: string; base_url: string }) => {
      if (!companyId) throw new Error('Selecione a empresa antes de salvar o relógio.');
      const payload = { company_id: companyId, ...values } as never;
      const { error } = values.id
        ? await supabase.from('hr_timeclock_devices').update(payload).eq('id', values.id)
        : await supabase.from('hr_timeclock_devices').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Relógio de ponto salvo');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncPunches = useMutation({
    mutationFn: async (deviceId?: string) => {
      const { data, error } = await supabase.functions.invoke('hr-timeclock-sync', {
        body: deviceId ? { device_id: deviceId } : {},
      });
      if (error) throw error;
      return data as { results?: Array<{ device: string; inserted?: number; error?: string }> };
    },
    onSuccess: (data) => {
      const results = data?.results ?? [];
      const failed = results.filter((r) => r.error);
      const inserted = results.reduce((a, r) => a + (r.inserted ?? 0), 0);
      if (failed.length > 0) toast.error(`Falha em ${failed.length} relógio(s): ${failed[0].error}`);
      else toast.success(`${inserted} nova(s) batida(s) importada(s)`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { devices, syncLogs, saveDevice, syncPunches };
}
