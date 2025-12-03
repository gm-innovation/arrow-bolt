import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, Lightbulb } from "lucide-react";
import { useMeasurementMaterials } from "@/hooks/useMeasurementMaterials";
import { useMeasurementSettings } from "@/hooks/useMeasurementSettings";

const materialSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(255),
  quantity: z.number().min(0.01, "Quantidade deve ser maior que 0"),
  unit_value: z.number().min(0, "Valor deve ser maior ou igual a 0"),
  markup_percentage: z.number().min(0).max(100),
});

interface MaterialsTabProps {
  measurementId: string;
  materials: any[];
  disabled?: boolean;
  technicianMaterials?: string[];
}

export const MaterialsTab = ({ measurementId, materials, disabled, technicianMaterials }: MaterialsTabProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const { addMaterial, removeMaterial } = useMeasurementMaterials();
  const { settings } = useMeasurementSettings();

  const form = useForm({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: '',
      quantity: 1,
      unit_value: 0,
      markup_percentage: settings?.default_material_markup || 30,
    },
  });

  const onSubmit = (data: z.infer<typeof materialSchema>) => {
    const baseValue = data.quantity * data.unit_value;
    const totalValue = baseValue * (1 + data.markup_percentage / 100);

    addMaterial.mutate({
      measurement_id: measurementId,
      name: data.name.trim(),
      quantity: data.quantity,
      unit_value: data.unit_value,
      markup_percentage: data.markup_percentage,
      total_value: totalValue,
    });

    form.reset({
      name: '',
      quantity: 1,
      unit_value: 0,
      markup_percentage: settings?.default_material_markup || 30,
    });
    setIsAdding(false);
  };

  // Filter out empty materials
  const filteredTechnicianMaterials = technicianMaterials?.filter(m => m && m.trim() !== '');

  return (
    <div className="space-y-4">
      {/* Reference: Materials reported by technicians */}
      {filteredTechnicianMaterials && filteredTechnicianMaterials.length > 0 && (
        <Card className="p-4 bg-muted/50 border-primary/20">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Materiais informados pelo técnico:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {filteredTechnicianMaterials.map((material, index) => (
                  <li key={index} className="border-l-2 border-primary/30 pl-2">
                    {material}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {!disabled && !isAdding && (
        <Button onClick={() => setIsAdding(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Material
        </Button>
      )}

      {isAdding && (
        <Card className="p-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Material</Label>
              <Input
                {...form.register('name')}
                placeholder="Ex: Cabo de Rede Cat6"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('quantity', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor Unitário (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('unit_value', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label>Markup (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('markup_percentage', { valueAsNumber: true })}
                />
              </div>
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

      {materials.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Valor Unit.</TableHead>
              <TableHead className="text-right">Markup</TableHead>
              <TableHead className="text-right">Total</TableHead>
              {!disabled && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">R$ {Number(item.unit_value).toFixed(2)}</TableCell>
                <TableCell className="text-right">{item.markup_percentage}%</TableCell>
                <TableCell className="text-right font-medium">
                  R$ {Number(item.total_value).toFixed(2)}
                </TableCell>
                {!disabled && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMaterial.mutate(item.id)}
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
          Nenhum material adicionado
        </div>
      )}
    </div>
  );
};
