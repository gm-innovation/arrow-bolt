import { FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export const TechniciansSelection = ({ selectedTechnicians, onTechnicianToggle, leadTechId, onLeadTechChange }: any) => {
  return (
    <div className="space-y-4">
      <FormLabel>Técnicos</FormLabel>
      <div className="grid grid-cols-1 gap-4 border rounded-lg p-4">
        <Select onValueChange={onTechnicianToggle}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione os técnicos" />
          </SelectTrigger>
          <SelectContent>
            {mockTechnicians.map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                {tech.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTechnicians.length > 0 && (
          <div className="space-y-2">
            <FormLabel>Técnico Responsável</FormLabel>
            <RadioGroup value={leadTechId} onValueChange={onLeadTechChange}>
              {selectedTechnicians.map((techId) => {
                const tech = mockTechnicians.find(t => t.id === techId);
                return (
                  <div key={techId} className="flex items-center space-x-2">
                    <RadioGroupItem value={techId} id={techId} />
                    <Label htmlFor={techId}>{tech?.name}</Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        )}
      </div>
    </div>
  );
};

export const mockTechnicians = [
  { id: "t1", name: "Carlos Oliveira" },
  { id: "t2", name: "Ana Paula" },
  { id: "t3", name: "Roberto Santos" },
];