import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, RefreshCw, Package, AlertCircle } from "lucide-react";
import { useOsMaterials, OsMaterial } from "@/hooks/useOsMaterials";
import { useEvaMaterials } from "@/hooks/useEvaMaterials";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MaterialsSectionProps {
  serviceOrderId: string;
  orderNumber: string;
  vesselName?: string;
}

export const MaterialsSection = ({ serviceOrderId, orderNumber, vesselName }: MaterialsSectionProps) => {
  const { 
    materials, 
    isLoading, 
    syncFromEva, 
    addMaterial, 
    updateMaterial, 
    removeMaterial,
    refetch 
  } = useOsMaterials(serviceOrderId);
  
  const { fetchEvaMaterials, isLoading: isFetchingEva } = useEvaMaterials();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: '', unit_value: 0, quantity: 1 });
  const [vesselMismatch, setVesselMismatch] = useState<string | null>(null);

  // Auto-sync from Eva when there are no materials
  useEffect(() => {
    if (!isLoading && materials.length === 0 && orderNumber) {
      handleSyncFromEva();
    }
  }, [isLoading, materials.length, orderNumber]);

  const handleSyncFromEva = async () => {
    if (!orderNumber) return;
    
    const result = await fetchEvaMaterials(orderNumber);
    
    if (result.success && result.materials) {
      // Check vessel name match
      if (vesselName && result.vesselName && 
          result.vesselName.toLowerCase() !== vesselName.toLowerCase()) {
        setVesselMismatch(result.vesselName);
      } else {
        setVesselMismatch(null);
      }
      
      await syncFromEva.mutateAsync({
        serviceOrderId,
        materials: result.materials,
      });
    }
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    if (quantity < 0) return;
    updateMaterial.mutate({ id, quantity });
  };

  const handleUsedChange = (id: string, used: boolean) => {
    updateMaterial.mutate({ id, used });
  };

  const handleAddManualMaterial = () => {
    if (!newMaterial.name.trim()) return;
    
    addMaterial.mutate({
      service_order_id: serviceOrderId,
      name: newMaterial.name.trim(),
      unit_value: newMaterial.unit_value,
      quantity: newMaterial.quantity,
    });
    
    setNewMaterial({ name: '', unit_value: 0, quantity: 1 });
    setIsAddDialogOpen(false);
  };

  const handleRemove = (id: string) => {
    removeMaterial.mutate(id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const usedMaterials = materials.filter(m => m.used);
  const totalValue = usedMaterials.reduce((sum, m) => sum + (m.unit_value * m.quantity), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {materials.length} materiais • {usedMaterials.length} utilizados
          </span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncFromEva}
            disabled={isFetchingEva || !orderNumber}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingEva ? 'animate-spin' : ''}`} />
            Sincronizar Eva
          </Button>
          <Button 
            size="sm" 
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Manual
          </Button>
        </div>
      </div>

      {/* Vessel mismatch warning */}
      {vesselMismatch && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> A embarcação no Eva ({vesselMismatch}) é diferente da OS ({vesselName}).
            Verifique se o número da OS está correto.
          </AlertDescription>
        </Alert>
      )}

      {/* Materials table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : materials.length === 0 ? (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum material encontrado para esta OS.</p>
            <p className="text-sm mt-2">
              {orderNumber 
                ? "Clique em 'Sincronizar Eva' para buscar materiais do estoque."
                : "Número da OS não configurado."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Usado</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="w-24 text-center">Qtd</TableHead>
                <TableHead className="w-28 text-right">Valor Unit.</TableHead>
                <TableHead className="w-28 text-right">Total</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material) => (
                <TableRow 
                  key={material.id}
                  className={!material.used ? "opacity-50 bg-muted/30" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={material.used}
                      onCheckedChange={(checked) => handleUsedChange(material.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{material.name}</div>
                      <div className="flex gap-1">
                        <Badge variant={material.source === 'eva' ? 'default' : 'secondary'} className="text-xs">
                          {material.source === 'eva' ? 'Eva' : 'Manual'}
                        </Badge>
                        {material.external_product_code && (
                          <Badge variant="outline" className="text-xs">
                            {material.external_product_code}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={material.quantity}
                      onChange={(e) => handleQuantityChange(material.id, parseInt(e.target.value) || 0)}
                      className="w-20 text-center"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(material.unit_value)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(material.unit_value * material.quantity)}
                  </TableCell>
                  <TableCell>
                    {material.source === 'manual' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(material.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Total */}
      {materials.length > 0 && (
        <div className="flex justify-end">
          <Card className="px-4 py-2">
            <div className="text-sm text-muted-foreground">Total Materiais Utilizados:</div>
            <div className="text-xl font-bold">{formatCurrency(totalValue)}</div>
          </Card>
        </div>
      )}

      {/* Add manual material dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Material Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Material</Label>
              <Input
                value={newMaterial.name}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Cabo de alimentação"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={newMaterial.quantity}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Unitário (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newMaterial.unit_value}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, unit_value: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddManualMaterial} disabled={!newMaterial.name.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
