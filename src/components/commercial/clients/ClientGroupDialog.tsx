import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Link2, Crown } from "lucide-react";

interface Client {
  id: string;
  name: string;
  cnpj: string | null;
  segment: string | null;
  parent_client_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClients: Client[];
  onConfirm: (parentId: string, childIds: string[]) => void;
  isLoading?: boolean;
}

export const ClientGroupDialog = ({ open, onOpenChange, selectedClients, onConfirm, isLoading }: Props) => {
  const [parentId, setParentId] = useState<string>("");

  // Default to first client as parent
  useMemo(() => {
    if (selectedClients.length > 0 && !parentId) {
      setParentId(selectedClients[0].id);
    }
  }, [selectedClients]);

  const handleConfirm = () => {
    if (!parentId) return;
    const childIds = selectedClients.filter(c => c.id !== parentId).map(c => c.id);
    onConfirm(parentId, childIds);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Agrupar Clientes
          </DialogTitle>
          <DialogDescription>
            Selecione qual será o cliente principal (pai) do grupo. Os demais serão vinculados a ele.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm font-medium text-muted-foreground">
            {selectedClients.length} clientes selecionados
          </p>
          
          <RadioGroup value={parentId} onValueChange={setParentId}>
            {selectedClients.map(client => (
              <div
                key={client.id}
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  parentId === client.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setParentId(client.id)}
              >
                <RadioGroupItem value={client.id} id={client.id} />
                <Label htmlFor={client.id} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{client.name}</span>
                    {parentId === client.id && (
                      <Badge variant="default" className="text-xs gap-1">
                        <Crown className="h-3 w-3" /> Principal
                      </Badge>
                    )}
                  </div>
                  {client.cnpj && (
                    <p className="text-xs text-muted-foreground mt-0.5">{client.cnpj}</p>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!parentId || isLoading}>
            {isLoading ? "Agrupando..." : "Confirmar Agrupamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};