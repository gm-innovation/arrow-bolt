import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, AlertTriangle } from "lucide-react";
import { useMeasurementManHours } from "@/hooks/useMeasurementManHours";
import { useServiceRates } from "@/hooks/useServiceRates";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const manHourSchema = z.object({
  entry_date: z.string().min(1, "Data obrigatória"),
  start_time: z.string().min(1, "Horário obrigatório"),
  end_time: z.string().min(1, "Horário obrigatório"),
  hour_type: z.enum(['work_normal', 'work_extra', 'work_night', 'standby']),
  work_type: z.enum(['trabalho', 'espera_deslocamento', 'laboratorio']),
  technician_name: z.string().min(1, "Nome obrigatório"),
  technician_role: z.enum(['tecnico', 'auxiliar', 'engenheiro', 'supervisor']),
});

interface ManHoursTabProps {
  measurementId: string;
  serviceOrderId: string;
  manHours: any[];
  disabled?: boolean;
}

interface TimeEntryWithRole {
  id: string;
  entry_date: string;
  start_time: string;
  end_time: string;
  entry_type: string;
  technician_name: string;
  role_type: 'tecnico' | 'auxiliar';
  total_hours: number;
  hourly_rate: number;
  total_value: number;
}

export const ManHoursTab = ({ measurementId, serviceOrderId, manHours, disabled }: ManHoursTabProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const { addManHour, removeManHour } = useMeasurementManHours();
  const { getRate, rates } = useServiceRates();

  // Buscar time_entries automaticamente do banco
  const { data: technicianTimeEntries = [], isLoading: isLoadingEntries } = useQuery({
    queryKey: ['time-entries-for-measurement', serviceOrderId],
    queryFn: async () => {
      // 1. Buscar todas as tasks da OS
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('service_order_id', serviceOrderId);

      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) return [];

      const taskIds = tasks.map(t => t.id);

      // 2. Buscar time_entries com dados do técnico
      const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select(`
          id,
          entry_date,
          start_time,
          end_time,
          entry_type,
          technician_id,
          technician:technicians!inner (
            id,
            user_id,
            profiles:user_id (
              full_name
            )
          )
        `)
        .in('task_id', taskIds);

      if (entriesError) throw entriesError;
      if (!entries || entries.length === 0) return [];

      // 3. Buscar todas as visitas da OS
      const { data: visits, error: visitsError } = await supabase
        .from('service_visits')
        .select('id')
        .eq('service_order_id', serviceOrderId);

      if (visitsError) throw visitsError;
      if (!visits || visits.length === 0) return [];

      const visitIds = visits.map(v => v.id);

      // 4. Buscar visit_technicians para saber is_lead
      const { data: visitTechs, error: visitTechsError } = await supabase
        .from('visit_technicians')
        .select('technician_id, is_lead')
        .in('visit_id', visitIds);

      if (visitTechsError) throw visitTechsError;

      // Criar um mapa de technician_id -> is_lead
      const isLeadMap = new Map<string, boolean>();
      visitTechs?.forEach(vt => {
        // Se o técnico é líder em qualquer visita, ele é considerado líder
        if (vt.is_lead) {
          isLeadMap.set(vt.technician_id, true);
        } else if (!isLeadMap.has(vt.technician_id)) {
          isLeadMap.set(vt.technician_id, false);
        }
      });

      // 5. Processar cada entry e calcular valores
      const processedEntries: TimeEntryWithRole[] = entries.map(entry => {
        const technicianId = entry.technician_id;
        const isLead = isLeadMap.get(technicianId) ?? false;
        const roleType = isLead ? 'tecnico' : 'auxiliar';

        // Calcular horas
        const startTime = new Date(`1970-01-01T${entry.start_time}`);
        const endTime = new Date(`1970-01-01T${entry.end_time}`);
        const diffMs = endTime.getTime() - startTime.getTime();
        const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        // Buscar taxa
        const rate = rates.find(
          r => r.role_type === roleType && 
              r.hour_type === entry.entry_type && 
              r.work_type === 'trabalho'
        );
        const hourlyRate = rate?.rate_value || 0;
        const totalValue = hourlyRate * totalHours;

        const technicianData = entry.technician as any;
        const technicianName = technicianData?.profiles?.full_name || 'Técnico';

        return {
          id: entry.id,
          entry_date: entry.entry_date,
          start_time: entry.start_time,
          end_time: entry.end_time,
          entry_type: entry.entry_type,
          technician_name: technicianName,
          role_type: roleType,
          total_hours: totalHours,
          hourly_rate: hourlyRate,
          total_value: totalValue,
        };
      });

      return processedEntries;
    },
    enabled: !!serviceOrderId && rates.length >= 0,
  });

  const form = useForm({
    resolver: zodResolver(manHourSchema),
    defaultValues: {
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '08:00',
      end_time: '17:00',
      hour_type: 'work_normal' as const,
      work_type: 'trabalho' as const,
      technician_name: '',
      technician_role: 'tecnico' as const,
    },
  });

  const calculateHours = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return ((endMinutes - startMinutes) / 60).toFixed(2);
  };

  const onSubmit = (data: z.infer<typeof manHourSchema>) => {
    const totalHours = parseFloat(calculateHours(data.start_time, data.end_time));
    const rate = getRate(data.technician_role, data.hour_type, data.work_type);
    const hourlyRate = rate?.rate_value || 0;
    const totalValue = totalHours * hourlyRate;

    addManHour.mutate({
      measurement_id: measurementId,
      entry_date: data.entry_date,
      start_time: data.start_time,
      end_time: data.end_time,
      hour_type: data.hour_type,
      work_type: data.work_type,
      technician_name: data.technician_name,
      technician_role: data.technician_role,
      total_hours: totalHours,
      hourly_rate: hourlyRate,
      total_value: totalValue,
    });

    form.reset();
    setIsAdding(false);
  };

  const hourTypeLabels = {
    work_normal: 'HN',
    work_extra: 'HE',
    work_night: 'Noturna',
    standby: 'Espera',
  };

  const workTypeLabels = {
    trabalho: 'Trabalho',
    espera_deslocamento: 'Espera/Deslocamento',
    laboratorio: 'Laboratório',
  };

  const roleLabels = {
    tecnico: 'Técnico',
    auxiliar: 'Auxiliar',
    engenheiro: 'Engenheiro',
    supervisor: 'Supervisor',
  };

  // Calcular subtotal das horas automáticas
  const autoSubtotal = technicianTimeEntries.reduce((sum, e) => sum + e.total_value, 0);
  const hasZeroRates = technicianTimeEntries.some(e => e.hourly_rate === 0);

  return (
    <div className="space-y-6">
      {/* Seção de horas automáticas do banco */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Horas Registradas pelos Técnicos</h3>
          <span className="text-xs text-muted-foreground">(automático - somente leitura)</span>
        </div>

        {hasZeroRates && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">
              Algumas taxas de serviço não estão configuradas. Configure em Configurações → Taxas de Serviço.
            </span>
          </div>
        )}

        {isLoadingEntries ? (
          <div className="text-center py-4 text-muted-foreground text-sm">Carregando...</div>
        ) : technicianTimeEntries.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead className="text-right">Taxa/h</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {technicianTimeEntries.map((item) => (
                  <TableRow key={item.id} className="bg-muted/30">
                    <TableCell>{format(new Date(item.entry_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{item.start_time} - {item.end_time}</TableCell>
                    <TableCell>{hourTypeLabels[item.entry_type as keyof typeof hourTypeLabels] || item.entry_type}</TableCell>
                    <TableCell>
                      {item.technician_name}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {roleLabels[item.role_type]}
                      </span>
                    </TableCell>
                    <TableCell>{item.total_hours}h</TableCell>
                    <TableCell className="text-right">
                      R$ {Number(item.hourly_rate).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {Number(item.total_value).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-right text-sm font-medium">
              Subtotal Técnicos: R$ {autoSubtotal.toFixed(2)}
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm border border-dashed rounded-lg">
            Nenhum apontamento de horas registrado pelos técnicos
          </div>
        )}
      </div>

      {/* Seção de entradas adicionais do coordenador */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Entradas Adicionais do Coordenador</h3>
            <span className="text-xs text-muted-foreground">(editável)</span>
          </div>
          {!disabled && !isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>

        {isAdding && (
          <Card className="p-4">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" {...form.register('entry_date')} />
                </div>
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input type="time" {...form.register('start_time')} />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input type="time" {...form.register('end_time')} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Hora</Label>
                  <Select onValueChange={(v) => form.setValue('hour_type', v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work_normal">Hora Normal (HN)</SelectItem>
                      <SelectItem value="work_extra">Hora Extra (HE)</SelectItem>
                      <SelectItem value="work_night">Noturna</SelectItem>
                      <SelectItem value="standby">Espera</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Trabalho</Label>
                  <Select onValueChange={(v) => form.setValue('work_type', v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trabalho">Trabalho</SelectItem>
                      <SelectItem value="espera_deslocamento">Espera/Deslocamento</SelectItem>
                      <SelectItem value="laboratorio">Laboratório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select onValueChange={(v) => form.setValue('technician_role', v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="auxiliar">Auxiliar</SelectItem>
                      <SelectItem value="engenheiro">Engenheiro</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome do Técnico</Label>
                <Input {...form.register('technician_name')} placeholder="Ex: João Silva" />
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm">Adicionar</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {manHours.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead className="text-right">Taxa/h</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {!disabled && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {manHours.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{format(new Date(item.entry_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{item.start_time} - {item.end_time}</TableCell>
                  <TableCell>{hourTypeLabels[item.hour_type as keyof typeof hourTypeLabels]}</TableCell>
                  <TableCell>{workTypeLabels[item.work_type as keyof typeof workTypeLabels]}</TableCell>
                  <TableCell>
                    {item.technician_name}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {roleLabels[item.technician_role as keyof typeof roleLabels]}
                    </span>
                  </TableCell>
                  <TableCell>{item.total_hours}h</TableCell>
                  <TableCell className="text-right">
                    R$ {Number(item.hourly_rate).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {Number(item.total_value).toFixed(2)}
                  </TableCell>
                  {!disabled && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeManHour.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm border border-dashed rounded-lg">
            Nenhuma entrada adicional
          </div>
        )}
      </div>
    </div>
  );
};
