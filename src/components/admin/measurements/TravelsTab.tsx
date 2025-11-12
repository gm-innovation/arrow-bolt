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
import { useMeasurementTravels } from "@/hooks/useMeasurementTravels";
import { useMeasurementSettings } from "@/hooks/useMeasurementSettings";
import { useCityDistances } from "@/hooks/useCityDistances";

const travelSchema = z.object({
  travel_type: z.enum(['carro_proprio', 'carro_alugado', 'passagem_aerea']),
  from_city: z.string().min(1, "Cidade origem obrigatória"),
  to_city: z.string().min(1, "Cidade destino obrigatória"),
  distance_km: z.number().optional(),
  fixed_value: z.number().optional(),
  description: z.string().max(500).optional(),
});

interface TravelsTabProps {
  measurementId: string;
  travels: any[];
  disabled?: boolean;
}

export const TravelsTab = ({ measurementId, travels, disabled }: TravelsTabProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const { addTravel, removeTravel } = useMeasurementTravels();
  const { settings } = useMeasurementSettings();
  const { getDistance } = useCityDistances();

  const form = useForm({
    resolver: zodResolver(travelSchema),
    defaultValues: {
      travel_type: 'carro_proprio' as const,
      from_city: '',
      to_city: '',
      distance_km: undefined,
      fixed_value: 0,
      description: '',
    },
  });

  const travelType = form.watch('travel_type');
  const fromCity = form.watch('from_city');
  const toCity = form.watch('to_city');

  // Auto-buscar distância quando as cidades mudarem
  const handleCityChange = () => {
    if (fromCity && toCity && travelType === 'carro_proprio') {
      const distance = getDistance(fromCity, toCity);
      if (distance) {
        form.setValue('distance_km', distance.distance_km);
      }
    }
  };

  const onSubmit = (data: z.infer<typeof travelSchema>) => {
    let totalValue = 0;
    let kmRate = settings?.km_rate || 2.5;

    if (data.travel_type === 'carro_proprio' && data.distance_km) {
      totalValue = data.distance_km * kmRate;
    } else {
      totalValue = data.fixed_value || 0;
    }

    addTravel.mutate({
      measurement_id: measurementId,
      travel_type: data.travel_type,
      from_city: data.from_city.trim(),
      to_city: data.to_city.trim(),
      distance_km: data.distance_km,
      km_rate: travelType === 'carro_proprio' ? kmRate : undefined,
      fixed_value: data.fixed_value,
      total_value: totalValue,
      description: data.description?.trim(),
    });

    form.reset();
    setIsAdding(false);
  };

  const travelTypeLabels = {
    carro_proprio: 'Carro Próprio',
    carro_alugado: 'Carro Alugado',
    passagem_aerea: 'Passagem Aérea',
  };

  return (
    <div className="space-y-4">
      {!disabled && !isAdding && (
        <Button onClick={() => setIsAdding(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Deslocamento
        </Button>
      )}

      {isAdding && (
        <Card className="p-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Deslocamento</Label>
              <Select onValueChange={(v) => form.setValue('travel_type', v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro_proprio">Carro Próprio (por KM)</SelectItem>
                  <SelectItem value="carro_alugado">Carro Alugado (valor fixo)</SelectItem>
                  <SelectItem value="passagem_aerea">Passagem Aérea (valor fixo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade Origem</Label>
                <Input
                  {...form.register('from_city')}
                  placeholder="Ex: São Paulo"
                  onBlur={handleCityChange}
                />
              </div>

              <div className="space-y-2">
                <Label>Cidade Destino</Label>
                <Input
                  {...form.register('to_city')}
                  placeholder="Ex: Rio de Janeiro"
                  onBlur={handleCityChange}
                />
              </div>
            </div>

            {travelType === 'carro_proprio' ? (
              <div className="space-y-2">
                <Label>Distância (KM)</Label>
                <Input
                  type="number"
                  {...form.register('distance_km', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Taxa: R$ {settings?.km_rate?.toFixed(2) || '2,50'}/km
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Valor Gasto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('fixed_value', { valueAsNumber: true })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações (Opcional)</Label>
              <Input
                {...form.register('description')}
                placeholder="Ex: Viagem para manutenção urgente"
              />
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

      {travels.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Rota</TableHead>
              <TableHead className="text-right">Distância/Valor</TableHead>
              <TableHead className="text-right">Total</TableHead>
              {!disabled && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {travels.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{travelTypeLabels[item.travel_type as keyof typeof travelTypeLabels]}</TableCell>
                <TableCell>
                  {item.from_city} → {item.to_city}
                  {item.description && (
                    <>
                      <br />
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {item.distance_km && `${item.distance_km} km × R$ ${Number(item.km_rate).toFixed(2)}`}
                  {item.fixed_value && `R$ ${Number(item.fixed_value).toFixed(2)}`}
                </TableCell>
                <TableCell className="text-right font-medium">
                  R$ {Number(item.total_value).toFixed(2)}
                </TableCell>
                {!disabled && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTravel.mutate(item.id)}
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
          Nenhum deslocamento adicionado
        </div>
      )}
    </div>
  );
};
