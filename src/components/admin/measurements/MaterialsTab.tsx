import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Lightbulb, Package, Download } from "lucide-react";
import { useMeasurementMaterials } from "@/hooks/useMeasurementMaterials";
import { useMeasurementSettings } from "@/hooks/useMeasurementSettings";
import { useOsMaterials } from "@/hooks/useOsMaterials";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

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
  serviceOrderId?: string;
}

export const MaterialsTab = ({ measurementId, materials, disabled, technicianMaterials, serviceOrderId }: MaterialsTabProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedForImport, setSelectedForImport] = useState<string[]>([]);
  const { addMaterial, removeMaterial } = useMeasurementMaterials();
  const { settings } = useMeasurementSettings();
  const { materials: osMaterials, getUsedMaterials } = useOsMaterials(serviceOrderId);
  const { toast } = useToast();

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

  // Get used materials from OS that aren't already imported
  const availableForImport = getUsedMaterials().filter(osMat => 
    !materials.some(m => m.external_product_id === osMat.external_product_id)
  );

  const handleOpenImportDialog = () => {
    setSelectedForImport(availableForImport.map(m => m.id));
    setIsImportDialogOpen(true);
  };

  const handleImportMaterials = async () => {
    const markup = settings?.default_material_markup || 30;
    const materialsToImport = availableForImport.filter(m => selectedForImport.includes(m.id));

    for (const osMat of materialsToImport) {
      const baseValue = osMat.quantity * osMat.unit_value;
      const totalValue = baseValue * (1 + markup / 100);

      await addMaterial.mutateAsync({
        measurement_id: measurementId,
        name: osMat.name,
        quantity: osMat.quantity,
        unit_value: osMat.unit_value,
        markup_percentage: markup,
        total_value: totalValue,
        external_product_id: osMat.external_product_id,
        external_product_code: osMat.external_product_code,
        source: osMat.source,
      });
    }

    toast({
      title: "Materiais importados",
      description: `${materialsToImport.length} materiais importados com sucesso`,
    });

    setIsImportDialogOpen(false);
    setSelectedForImport([]);
  };

  const toggleSelectAll = () => {
    if (selectedForImport.length === availableForImport.length) {
      setSelectedForImport([]);
    } else {
      setSelectedForImport(availableForImport.map(m => m.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedForImport(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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

      {/* Action buttons */}
      {!disabled && (
        <div className="flex gap-2 flex-wrap">
          {availableForImport.length > 0 && (
            <Button onClick={handleOpenImportDialog} size="sm" variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Importar da OS ({availableForImport.length})
            </Button>
          )}
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Material
            </Button>
          )}
        </div>
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
                <TableCell>
                  <div className="font-medium">{item.name}</div>
                  {item.source && (
                    <Badge variant={item.source === 'eva' ? 'default' : 'secondary'} className="text-xs mt-1">
                      {item.source === 'eva' ? 'Eva' : 'Manual'}
                    </Badge>
                  )}
                </TableCell>
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

      {/* Import from OS Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Importar Materiais da OS
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selecione os materiais utilizados pelo técnico para importar para a medição.
              O markup de {settings?.default_material_markup || 30}% será aplicado automaticamente.
            </p>
            
            {availableForImport.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedForImport.length === availableForImport.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">c/ Markup</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableForImport.map((item) => {
                      const markup = settings?.default_material_markup || 30;
                      const totalWithMarkup = item.unit_value * item.quantity * (1 + markup / 100);
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedForImport.includes(item.id)}
                              onCheckedChange={() => toggleSelectItem(item.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{item.name}</div>
                            <div className="flex gap-1 mt-1">
                              <Badge variant={item.source === 'eva' ? 'default' : 'secondary'} className="text-xs">
                                {item.source === 'eva' ? 'Eva' : 'Manual'}
                              </Badge>
                              {item.external_product_code && (
                                <Badge variant="outline" className="text-xs">
                                  {item.external_product_code}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unit_value)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(totalWithMarkup)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Todos os materiais já foram importados
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImportMaterials}
              disabled={selectedForImport.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Importar ({selectedForImport.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
