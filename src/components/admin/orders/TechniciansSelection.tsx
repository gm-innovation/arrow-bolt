import { FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TechniciansSelectionProps {
  technicians: { id: string; profiles?: { full_name: string } }[];
  selectedTechnicians: string[];
  onTechnicianToggle: (techId: string) => void;
  leadTechId: string;
  onLeadTechChange: (techId: string) => void;
  onRemoveTechnician: (techId: string) => void;
}

export const TechniciansSelection = ({ 
  technicians, 
  selectedTechnicians, 
  onTechnicianToggle, 
  leadTechId, 
  onLeadTechChange,
  onRemoveTechnician 
}: TechniciansSelectionProps) => {
  const handleAddTechnician = (techId: string) => {
    if (!selectedTechnicians.includes(techId)) {
      onTechnicianToggle(techId);
      // Auto-select as lead if it's the first technician
      if (selectedTechnicians.length === 0) {
        onLeadTechChange(techId);
      }
    }
  };

  const handleRemove = (techId: string) => {
    onRemoveTechnician(techId);
    // If removing the lead tech, select the first remaining one
    if (techId === leadTechId && selectedTechnicians.length > 1) {
      const remaining = selectedTechnicians.filter(id => id !== techId);
      onLeadTechChange(remaining[0]);
    }
  };

  return (
    <div className="space-y-4">
      <FormLabel>Técnicos</FormLabel>
      <div className="border rounded-lg p-4 space-y-4">
        <Select onValueChange={handleAddTechnician}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione os técnicos" />
          </SelectTrigger>
          <SelectContent>
            {technicians
              .filter(tech => !selectedTechnicians.includes(tech.id))
              .map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.profiles?.full_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {selectedTechnicians.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Técnicos Selecionados:</div>
            <RadioGroup value={leadTechId} onValueChange={onLeadTechChange}>
              {selectedTechnicians.map((techId) => {
                const tech = technicians.find(t => t.id === techId);
                const isLead = techId === leadTechId;
                
                return (
                  <div 
                    key={techId} 
                    className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <RadioGroupItem value={techId} id={techId} />
                      <Label htmlFor={techId} className="flex-1 cursor-pointer font-normal">
                        {tech?.profiles?.full_name}
                      </Label>
                      {isLead && (
                        <Badge variant="default" className="text-xs">
                          Responsável
                        </Badge>
                      )}
                      {!isLead && (
                        <Badge variant="secondary" className="text-xs">
                          Auxiliar
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 ml-2"
                      onClick={() => handleRemove(techId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Selecione o técnico responsável clicando no botão de opção
            </p>
          </div>
        )}
      </div>
    </div>
  );
};