import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Helper function to import time entries
async function importTimeEntriesForMeasurement(
  measurementId: string,
  serviceOrderId: string,
  companyId: string
) {
  // Buscar todas as tasks da OS
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id')
    .eq('service_order_id', serviceOrderId);

  if (tasksError) throw tasksError;
  if (!tasks || tasks.length === 0) {
    return { count: 0 };
  }

  const taskIds = tasks.map(t => t.id);

  // Buscar todos os time_entries das tasks
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
    return { count: 0 };
  }

  // Para cada time_entry, criar um measurement_man_hours
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
      .eq('company_id', companyId)
      .eq('role_type', roleType)
      .eq('hour_type', entry.entry_type)
      .eq('work_type', 'trabalho')
      .maybeSingle();

    const hourlyRate = rate?.rate_value || 0;
    const totalValue = hourlyRate * totalHours;

    manHoursToInsert.push({
      measurement_id: measurementId,
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

  if (manHoursToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('measurement_man_hours')
      .insert(manHoursToInsert);

    if (insertError) throw insertError;
  }

  return { count: manHoursToInsert.length };
}

export const useMeasurements = (serviceOrderId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar medição de uma OS específica
  const { data: measurement, isLoading } = useQuery({
    queryKey: ['measurement', serviceOrderId],
    queryFn: async () => {
      if (!serviceOrderId) return null;

      const { data, error } = await supabase
        .from('measurements')
        .select(`
          *,
          measurement_man_hours(*),
          measurement_materials(*),
          measurement_services(*),
          measurement_travels(*),
          measurement_expenses(*)
        `)
        .eq('service_order_id', serviceOrderId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!serviceOrderId,
  });

  // Criar medição
  const createMeasurement = useMutation({
    mutationFn: async (data: {
      service_order_id: string;
      category: 'CATIVO' | 'LABORATORIO' | 'EXTERNO';
    }) => {
      // Buscar company_id do usuário
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      // Criar medição
      const { data: newMeasurement, error } = await supabase
        .from('measurements')
        .insert({
          service_order_id: data.service_order_id,
          category: data.category,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Importar automaticamente os time_entries
      try {
        const importResult = await importTimeEntriesForMeasurement(
          newMeasurement.id,
          data.service_order_id,
          profileData.company_id
        );
        
        return { ...newMeasurement, importedHours: importResult.count };
      } catch (importError) {
        console.error('Erro ao importar horas automaticamente:', importError);
        // Não falhar a criação da medição se a importação falhar
        return { ...newMeasurement, importedHours: 0 };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['measurement', data.service_order_id] });
      const hoursMessage = data.importedHours > 0 
        ? ` ${data.importedHours} apontamentos de horas importados.`
        : '';
      toast({
        title: 'Medição criada',
        description: `Medição final criada com sucesso.${hoursMessage}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar medição',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar categoria da medição
  const updateCategory = useMutation({
    mutationFn: async (data: {
      id: string;
      category: 'CATIVO' | 'LABORATORIO' | 'EXTERNO';
    }) => {
      const { error } = await supabase
        .from('measurements')
        .update({ category: data.category })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Categoria atualizada',
        description: 'Categoria da medição atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar categoria',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Finalizar medição
  const finalizeMeasurement = useMutation({
    mutationFn: async (measurementId: string) => {
      const { error } = await supabase
        .from('measurements')
        .update({
          status: 'finalized',
          finalized_by: user?.id,
          finalized_at: new Date().toISOString(),
        })
        .eq('id', measurementId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Medição finalizada',
        description: 'Medição final finalizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao finalizar medição',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    measurement,
    isLoading,
    createMeasurement,
    updateCategory,
    finalizeMeasurement,
  };
};
