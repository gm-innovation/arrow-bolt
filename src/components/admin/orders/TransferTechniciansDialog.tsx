import { useState } from "react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { mockTechnicians } from "./TechniciansSelection";

interface TransferTechniciansDialogProps {
  orderId: string;
  onClose: () => void;
}

export const TransferTechniciansDialog = ({ orderId, onClose }: TransferTechniciansDialogProps) => {
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const { toast } = useToast();

  const handleTransfer = () => {
    if (!selectedTechnician) {
      toast({
        title: "Erro",
        description: "Selecione um técnico para transferir.",
        variant: "destructive",
      });
      return;
    }

    // Here you would make the API call to transfer the technician
    console.log(`Transferindo OS ${orderId} para técnico ${selectedTechnician}`);
    
    toast({
      title: "Técnico transferido",
      description: "A OS foi transferida com sucesso!",
    });
    
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Transferir Técnicos</DialogTitle>
        <DialogDescription>
          Selecione o técnico para transferir a OS #{orderId}
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 pt-4">
        <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o técnico" />
          </SelectTrigger>
          <SelectContent>
            {mockTechnicians.map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                {tech.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleTransfer}>
            Transferir
          </Button>
        </div>
      </div>
    </DialogContent>
  );
};