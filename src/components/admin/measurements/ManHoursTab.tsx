import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { useMeasurementManHours } from "@/hooks/useMeasurementManHours";
import { useServiceRates } from "@/hooks/useServiceRates";
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
  manHours: any[];
  disabled?: boolean;
}

export const ManHoursTab = ({ measurementId, manHours, disabled }: ManHoursTabProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const { addManHour, removeManHour } = useMeasurementManHours();
  const { getRate } = useServiceRates();

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

  return (
    <div className="space-y-4">
      {!disabled && !isAdding && (
        <Button onClick={() => setIsAdding(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Mão de Obra
        </Button>
      )}

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
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma entrada de mão de obra adicionada
        </div>
      )}
    </div>
  );
};
