import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useImportTimeEntries = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const importTimeEntries = useMutation({
    mutationFn: async (data: {
      measurementId: string;
      serviceOrderId: string;
    }) => {
      // 1. Buscar company_id do usuário
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      // 2. Buscar todas as tasks da OS
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('service_order_id', data.serviceOrderId);

      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) {
        throw new Error('Nenhuma tarefa encontrada para esta OS');
      }

      const taskIds = tasks.map(t => t.id);

      // 3. Buscar todos os time_entries das tasks
      const { data: timeEntries, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select(`
          *,
          technician:technicians (
            id,
            user_id,
            specialty,
            profiles:user_id (
              full_name
            )
          )
        `)
        .in('task_id', taskIds);

      if (timeEntriesError) throw timeEntriesError;
      if (!timeEntries || timeEntries.length === 0) {
        throw new Error('Nenhum apontamento de horas encontrado para esta OS');
      }

      // 4. Para cada time_entry, criar um measurement_man_hours
      const manHoursToInsert = [];

      for (const entry of timeEntries) {
        // Calcular total de horas
        const startTime = new Date(`1970-01-01T${entry.start_time}`);
        const endTime = new Date(`1970-01-01T${entry.end_time}`);
        const diffMs = endTime.getTime() - startTime.getTime();
        const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        // Determinar role_type baseado na specialty do técnico
        let roleType: 'tecnico' | 'auxiliar' | 'engenheiro' | 'supervisor' = 'tecnico';
        if (entry.technician?.specialty) {
          const specialty = entry.technician.specialty.toLowerCase();
          if (specialty.includes('engenheiro')) {
            roleType = 'engenheiro';
          } else if (specialty.includes('supervisor')) {
            roleType = 'supervisor';
          } else if (specialty.includes('auxiliar')) {
            roleType = 'auxiliar';
          }
        }

        // Buscar taxa do service_rates
        const { data: rate } = await supabase
          .from('service_rates')
          .select('rate_value')
          .eq('company_id', profileData.company_id)
          .eq('role_type', roleType)
          .eq('hour_type', entry.entry_type)
          .eq('work_type', 'trabalho')
          .maybeSingle();

        const hourlyRate = rate?.rate_value || 0;
        const totalValue = hourlyRate * totalHours;

        manHoursToInsert.push({
          measurement_id: data.measurementId,
          technician_id: entry.technician_id,
          technician_name: entry.technician?.profiles?.full_name || 'Técnico',
          technician_role: roleType,
          entry_date: entry.entry_date,
          start_time: entry.start_time,
          end_time: entry.end_time,
          hour_type: entry.entry_type,
          work_type: 'trabalho' as const,
          total_hours: totalHours,
          hourly_rate: hourlyRate,
          total_value: totalValue,
        });
      }

      // 5. Inserir todos os man_hours de uma vez
      const { error: insertError } = await supabase
        .from('measurement_man_hours')
        .insert(manHoursToInsert);

      if (insertError) throw insertError;

      return { count: manHoursToInsert.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Horas importadas',
        description: `${data.count} apontamentos de horas foram importados com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao importar horas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    importTimeEntries,
  };
};
