import { FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBatchTechnicianAvailability } from "@/hooks/useTechnicianAvailability";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TechniciansSelectionProps {
  technicians: { id: string; profiles?: { full_name: string } }[];
  selectedTechnicians: string[];
  onTechnicianToggle: (techId: string) => void;
  leadTechId: string;
  onLeadTechChange: (techId: string) => void;
  onRemoveTechnician: (techId: string) => void;
  scheduledDate?: Date;
}

const statusLabels: Record<string, string> = {
  vacation: 'Férias',
  day_off: 'Folga',
  medical_exam: 'Exame Médico',
  training: 'Treinamento',
  sick_leave: 'Atestado',
  on_call: 'Sobreaviso',
  available: 'Disponível'
};

export const TechniciansSelection = ({ 
  technicians, 
  selectedTechnicians, 
  onTechnicianToggle, 
  leadTechId, 
  onLeadTechChange,
  onRemoveTechnician,
  scheduledDate
}: TechniciansSelectionProps) => {
  const technicianIds = technicians.map(t => t.id);
  const { availabilityMap, isLoading } = useBatchTechnicianAvailability(technicianIds, scheduledDate);

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

  const renderAvailabilityBadge = (techId: string) => {
    const availability = availabilityMap[techId];
    if (!availability || isLoading) return null;

    if (!availability.is_available) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              {statusLabels[availability.status_type] || 'Indisponível'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Técnico indisponível</p>
            <p className="text-xs text-muted-foreground">{availability.status_description}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (availability.status_type === 'on_call') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="text-xs gap-1 bg-amber-100 text-amber-800 border-amber-200">
              <Phone className="h-3 w-3" />
              Sobreaviso
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Técnico de sobreaviso</p>
            <p className="text-xs text-muted-foreground">Disponível para emergências</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return null;
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
              .map((tech) => {
                const availability = availabilityMap[tech.id];
                const isUnavailable = availability && !availability.is_available;
                
                return (
                  <SelectItem 
                    key={tech.id} 
                    value={tech.id}
                    className={isUnavailable ? 'text-destructive' : ''}
                  >
                    <div className="flex items-center gap-2">
                      <span>{tech.profiles?.full_name}</span>
                      {isUnavailable && (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      )}
                      {availability?.status_type === 'on_call' && (
                        <Phone className="h-3 w-3 text-amber-600" />
                      )}
                    </div>
                  </SelectItem>
                );
              })}
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
                      {renderAvailabilityBadge(techId)}
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