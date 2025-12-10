import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { useMeasurementServices } from "@/hooks/useMeasurementServices";

const serviceSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(255),
  value: z.number().min(0, "Valor deve ser maior ou igual a 0"),
  description: z.string().max(500).optional(),
});

interface ServicesTabProps {
  measurementId: string;
  services: any[];
  disabled?: boolean;
}

export const ServicesTab = ({ measurementId, services, disabled }: ServicesTabProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const { addService, removeService } = useMeasurementServices();

  const form = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      value: 0,
      description: '',
    },
  });

  const onSubmit = (data: z.infer<typeof serviceSchema>) => {
    const description = data.description?.trim();
    
    addService.mutate({
      measurement_id: measurementId,
      name: data.name.trim(),
      value: data.value,
      description: description && description.length > 0 ? description : null,
    });

    form.reset({ name: '', value: 0, description: '' });
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      {!disabled && !isAdding && (
        <Button onClick={() => setIsAdding(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Serviço
        </Button>
      )}

      {isAdding && (
        <Card className="p-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Serviço</Label>
              <Input
                {...form.register('name')}
                placeholder="Ex: Configuração de rede"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register('value', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (Opcional)</Label>
              <Textarea
                {...form.register('description')}
                placeholder="Descreva o serviço realizado..."
                rows={3}
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

      {services.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serviço</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              {!disabled && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.description || '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  R$ {Number(item.value).toFixed(2)}
                </TableCell>
                {!disabled && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeService.mutate(item.id)}
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
          Nenhum serviço adicionado
        </div>
      )}
    </div>
  );
};
