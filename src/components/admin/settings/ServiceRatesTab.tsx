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
import { useServiceRates } from "@/hooks/useServiceRates";
import { Loader2, Save } from "lucide-react";

const rateSchema = z.object({
  role_type: z.enum(['tecnico', 'auxiliar', 'engenheiro', 'supervisor']),
  hour_type: z.enum(['work_normal', 'work_extra', 'work_night', 'standby']),
  work_type: z.enum(['trabalho', 'espera_deslocamento', 'laboratorio']),
  rate_value: z.number().min(0, "Valor deve ser maior ou igual a 0"),
});

export const ServiceRatesTab = () => {
  const { rates, isLoading, upsertRate } = useServiceRates();
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      role_type: 'tecnico' as const,
      hour_type: 'work_normal' as const,
      work_type: 'trabalho' as const,
      rate_value: 0,
    },
  });

  const roleLabels = {
    tecnico: 'Técnico',
    auxiliar: 'Auxiliar',
    engenheiro: 'Engenheiro',
    supervisor: 'Supervisor',
  };

  const hourTypeLabels = {
    work_normal: 'Hora Normal (HN)',
    work_extra: 'Hora Extra (HE)',
    work_night: 'Noturna',
    standby: 'Espera',
  };

  const workTypeLabels = {
    trabalho: 'Trabalho',
    espera_deslocamento: 'Espera/Deslocamento',
    laboratorio: 'Laboratório',
  };

  const handleEdit = (rate: any) => {
    const key = `${rate.role_type}-${rate.hour_type}-${rate.work_type}`;
    setEditingKey(key);
    form.reset({
      role_type: rate.role_type,
      hour_type: rate.hour_type,
      work_type: rate.work_type,
      rate_value: Number(rate.rate_value),
    });
  };

  const handleSave = async (data: z.infer<typeof rateSchema>) => {
    await upsertRate.mutateAsync({
      role_type: data.role_type,
      hour_type: data.hour_type,
      work_type: data.work_type,
      rate_value: data.rate_value,
    });
    setEditingKey(null);
    form.reset();
  };

  const getRateKey = (role: string, hour: string, work: string) => {
    return `${role}-${hour}-${work}`;
  };

  const getCurrentRate = (role: string, hour: string, work: string) => {
    return rates.find(
      (r) => r.role_type === role && r.hour_type === hour && r.work_type === work
    );
  };

  const renderRateCell = (role: string, hour: string, work: string) => {
    const key = getRateKey(role, hour, work);
    const rate = getCurrentRate(role, hour, work);
    const isEditing = editingKey === key;

    if (isEditing) {
      return (
        <form onSubmit={form.handleSubmit(handleSave)} className="flex gap-2">
          <Input
            type="number"
            step="0.01"
            {...form.register('rate_value', { valueAsNumber: true })}
            className="w-32"
          />
          <Button type="submit" size="sm" disabled={upsertRate.isPending}>
            {upsertRate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditingKey(null)}
          >
            Cancelar
          </Button>
        </form>
      );
    }

    return (
      <button
        onClick={() => {
          form.setValue('role_type', role as any);
          form.setValue('hour_type', hour as any);
          form.setValue('work_type', work as any);
          form.setValue('rate_value', rate?.rate_value || 0);
          handleEdit({ role_type: role, hour_type: hour, work_type: work, rate_value: rate?.rate_value || 0 });
        }}
        className="w-full text-left hover:bg-muted/50 p-2 rounded transition-colors"
      >
        {rate ? `R$ ${Number(rate.rate_value).toFixed(2)}` : '-'}
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const roles = Object.keys(roleLabels) as Array<keyof typeof roleLabels>;
  const hourTypes = Object.keys(hourTypeLabels) as Array<keyof typeof hourTypeLabels>;
  const workTypes = Object.keys(workTypeLabels) as Array<keyof typeof workTypeLabels>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Clique em qualquer célula para editar o valor. Os valores são usados para calcular automaticamente 
        os custos de mão de obra nas medições.
      </p>

      {roles.map((role) => (
        <Card key={role} className="p-4">
          <h3 className="font-semibold text-lg mb-4">{roleLabels[role]}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Tipo de Hora</TableHead>
                {workTypes.map((work) => (
                  <TableHead key={work} className="text-center">
                    {workTypeLabels[work]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {hourTypes.map((hour) => (
                <TableRow key={hour}>
                  <TableCell className="font-medium">
                    {hourTypeLabels[hour]}
                  </TableCell>
                  {workTypes.map((work) => (
                    <TableCell key={work} className="text-center">
                      {renderRateCell(role, hour, work)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ))}
    </div>
  );
};
