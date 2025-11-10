import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemSetting {
  key: string;
  value: any;
}

export const useSystemSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) throw error;

      // Transform array to object for easier access
      const settingsObj: Record<string, any> = {};
      data?.forEach((setting: SystemSetting) => {
        settingsObj[setting.key] = setting.value;
      });

      return settingsObj;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({
        title: "Configuração salva",
        description: "A configuração foi atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração",
        variant: "destructive",
      });
    },
  });

  const exportAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('service_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const csv = convertToCSV(data || []);
      downloadCSV(csv, 'audit_logs.csv');

      toast({
        title: "Logs exportados",
        description: "Os logs foram exportados com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível exportar os logs",
        variant: "destructive",
      });
    }
  };

  return {
    settings,
    isLoading,
    updateSetting: updateSettingMutation.mutate,
    exportAuditLogs,
  };
};

// Helper functions
function convertToCSV(data: any[]): string {
  if (!data.length) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value}"` : value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
