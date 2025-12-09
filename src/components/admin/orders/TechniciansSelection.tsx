import { FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Phone, Ship } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBatchTechnicianAvailability } from "@/hooks/useTechnicianAvailability";
import { useTechnicianConflicts } from "@/hooks/useTechnicianConflicts";

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
  const { availabilityMap, isLoading: availabilityLoading } = useBatchTechnicianAvailability(technicianIds, scheduledDate);
  const { conflictsMap, isLoading: conflictsLoading } = useTechnicianConflicts(technicianIds, scheduledDate);

  const isLoading = availabilityLoading || conflictsLoading;

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

  const getTechnicianStatus = (techId: string) => {
    const availability = availabilityMap[techId];
    const conflict = conflictsMap[techId];

    // Check for absence first (vacation, sick leave, etc.)
    if (availability && !availability.is_available) {
      return {
        isBlocked: true,
        type: 'absence',
        label: statusLabels[availability.status_type] || 'Indisponível',
        description: availability.status_description
      };
    }

    // Check for conflict with other OS
    if (conflict && conflict.has_conflict) {
      const orderInfo = conflict.conflict_orders.map(o => `OS ${o.order_number} - ${o.vessel_name}`).join(', ');
      return {
        isBlocked: true,
        type: 'conflict',
        label: 'Em outra OS',
        description: `Já escalado para: ${orderInfo}`
      };
    }

    // Check if on-call (not blocked, just informative)
    if (availability?.status_type === 'on_call') {
      return {
        isBlocked: false,
        type: 'on_call',
        label: 'Sobreaviso',
        description: 'Disponível para emergências'
      };
    }

    return {
      isBlocked: false,
      type: 'available',
      label: 'Disponível',
      description: ''
    };
  };

  const renderAvailabilityBadge = (techId: string) => {
    const status = getTechnicianStatus(techId);

    if (status.type === 'absence') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              {status.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Técnico indisponível</p>
            <p className="text-xs text-muted-foreground">{status.description}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (status.type === 'conflict') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="text-xs gap-1 bg-orange-100 text-orange-800 border-orange-200">
              <Ship className="h-3 w-3" />
              {status.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Conflito de escala</p>
            <p className="text-xs text-muted-foreground">{status.description}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (status.type === 'on_call') {
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

  // Filter available technicians for the dropdown
  const availableTechnicians = technicians.filter(tech => {
    if (selectedTechnicians.includes(tech.id)) return false;
    const status = getTechnicianStatus(tech.id);
    return !status.isBlocked;
  });

  const unavailableTechnicians = technicians.filter(tech => {
    if (selectedTechnicians.includes(tech.id)) return false;
    const status = getTechnicianStatus(tech.id);
    return status.isBlocked;
  });

  return (
    <div className="space-y-4">
      <FormLabel>Técnicos</FormLabel>
      <div className="border rounded-lg p-4 space-y-4">
        <Select onValueChange={handleAddTechnician}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione os técnicos" />
          </SelectTrigger>
          <SelectContent>
            {/* Available technicians */}
            {availableTechnicians.map((tech) => {
              const status = getTechnicianStatus(tech.id);
              return (
                <SelectItem 
                  key={tech.id} 
                  value={tech.id}
                >
                  <div className="flex items-center gap-2">
                    <span>{tech.profiles?.full_name}</span>
                    {status.type === 'on_call' && (
                      <Phone className="h-3 w-3 text-amber-600" />
                    )}
                  </div>
                </SelectItem>
              );
            })}

            {/* Separator if there are unavailable techs */}
            {unavailableTechnicians.length > 0 && availableTechnicians.length > 0 && (
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                Indisponíveis para esta data:
              </div>
            )}

            {/* Unavailable technicians (disabled) */}
            {unavailableTechnicians.map((tech) => {
              const status = getTechnicianStatus(tech.id);
              return (
                <SelectItem 
                  key={tech.id} 
                  value={tech.id}
                  disabled
                  className="opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="line-through">{tech.profiles?.full_name}</span>
                    <span className="text-xs text-destructive">({status.label})</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {scheduledDate && (
          <p className="text-xs text-muted-foreground">
            Mostrando disponibilidade para a data selecionada. Técnicos com ausência programada ou já escalados estão indisponíveis.
          </p>
        )}

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
