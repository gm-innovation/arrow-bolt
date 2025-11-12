import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useCityDistances } from "@/hooks/useCityDistances";

const distanceSchema = z.object({
  from_city: z.string().min(1, "Cidade origem obrigatória").max(100),
  to_city: z.string().min(1, "Cidade destino obrigatória").max(100),
  distance_km: z.number().min(1, "Distância deve ser maior que 0"),
});

export const CityDistancesTab = () => {
  const [isAdding, setIsAdding] = useState(false);
  const { distances, isLoading, addDistance, removeDistance } = useCityDistances();

  const form = useForm({
    resolver: zodResolver(distanceSchema),
    defaultValues: {
      from_city: '',
      to_city: '',
      distance_km: 0,
    },
  });

  const onSubmit = async (data: z.infer<typeof distanceSchema>) => {
    await addDistance.mutateAsync({
      from_city: data.from_city.trim(),
      to_city: data.to_city.trim(),
      distance_km: data.distance_km,
    });
    form.reset();
    setIsAdding(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Cadastre as distâncias entre cidades para cálculo automático de deslocamentos
        </p>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Distância
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="p-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cidade Origem</Label>
                <Input
                  {...form.register('from_city')}
                  placeholder="Ex: São Paulo"
                />
                {form.formState.errors.from_city && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.from_city.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Cidade Destino</Label>
                <Input
                  {...form.register('to_city')}
                  placeholder="Ex: Rio de Janeiro"
                />
                {form.formState.errors.to_city && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.to_city.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Distância (km)</Label>
                <Input
                  type="number"
                  {...form.register('distance_km', { valueAsNumber: true })}
                />
                {form.formState.errors.distance_km && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.distance_km.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={addDistance.isPending}>
                {addDistance.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Adicionar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  form.reset();
                  setIsAdding(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {distances.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cidade Origem</TableHead>
              <TableHead>Cidade Destino</TableHead>
              <TableHead className="text-right">Distância (km)</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distances.map((distance) => (
              <TableRow key={distance.id}>
                <TableCell className="font-medium">{distance.from_city}</TableCell>
                <TableCell className="font-medium">{distance.to_city}</TableCell>
                <TableCell className="text-right">{distance.distance_km} km</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDistance.mutate(distance.id)}
                    disabled={removeDistance.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma distância cadastrada
        </div>
      )}
    </div>
  );
};
